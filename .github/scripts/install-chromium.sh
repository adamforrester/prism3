#!/usr/bin/env bash
# #2323, #2348 — Install Chromium for the browser gates: bounded, retried, and each retry started clean.
#
# Run by ci.yml's "Install Chromium for the browser gates (#2323)" step; that step's comment says why the
# install is bounded and why three failures fail the job. This file holds what #2348 added.
#
# THE STALL #2348 FOUND. Playwright's `--with-deps` runs `apt-get` as root, through sudo. When `timeout`
# ends an attempt it signals `npx`, but the root `apt-get` survives (the runner user cannot signal a root
# process, and sudo runs it in its own session) and keeps the dpkg lock. Every later attempt then died at
# once with "Could not get lock /var/lib/dpkg/lock-frontend", so the retry could never help after a stall,
# which is the one case it exists for. So:
#   1. Before the first attempt, an apt config bounds what can hang: each fetch times out and is retried,
#      and apt waits for a held dpkg lock rather than failing on it.
#   2. Before attempts 2 and 3, a leftover `apt-get` from the attempt before is stopped, and
#      `dpkg --configure -a` finishes whatever it left half-configured.
#   3. Three failures still fail the job, with the same named error. Never advisory.
#
# THE SLOW MIRROR #2951 FOUND. The browser comes from the cache, but its system packages (about 26 MB,
# mostly CJK and Thai fonts) were fetched from Ubuntu's mirror on every run. A mirror that is slow but
# not stalled trips none of the apt timeouts above, so all three attempts ran past the bound. So apt
# keeps the packages it downloads in a directory the runner user owns (ARCHIVES), and ci.yml caches the
# `.deb` files in it, next to the browser cache. On a warm cache apt downloads nothing, and on a cold one
# each attempt keeps what the attempt before finished downloading. apt downloads as root here, not as
# `_apt`, because `_apt` cannot reach a directory under the runner's home.
#
# Tested by `.github/scripts/test-install-chromium.sh`, with a stand-in install that leaves a lock-holding
# child behind. The PRISM3_* variables exist for that test; CI sets none of them.
set -u

INSTALL=${PRISM3_INSTALL:-npx playwright install --with-deps chromium}
BOUND=${PRISM3_INSTALL_BOUND:-240}
SUDO=${PRISM3_SUDO-sudo}
APT_CONF=${PRISM3_APT_CONF:-/etc/apt/apt.conf.d/99prism3-ci}
ARCHIVES=${PRISM3_APT_ARCHIVES:-$HOME/.cache/prism3-apt}
CLEAR=${PRISM3_APT_CLEAR:-"$SUDO pkill -x apt-get; $SUDO pkill -x apt"}
REPAIR=${PRISM3_DPKG_REPAIR:-"$SUDO dpkg --configure -a"}

# The archive directory is created by the runner user, so ci.yml's cache can restore into it and save it.
if ! mkdir -p "$ARCHIVES/partial"; then
  echo "::error::could not create the apt archive directory $ARCHIVES; the browser gates cannot run"
  exit 1
fi

# 30 s per fetch, three retries, and up to 120 s waiting for a held lock: all inside one attempt's bound.
# Then the archive directory ci.yml caches (#2951).
if ! printf '%s\n' \
  'Acquire::http::Timeout "30";' \
  'Acquire::https::Timeout "30";' \
  'Acquire::Retries "3";' \
  'DPkg::Lock::Timeout "120";' \
  "Dir::Cache::Archives \"$ARCHIVES/\";" \
  'APT::Sandbox::User "root";' | $SUDO tee "$APT_CONF" > /dev/null; then
  echo "::error::could not write the apt config $APT_CONF; the browser gates cannot run"
  exit 1
fi

# What the cache restored, so a run's log shows whether the mirror is needed at all.
echo "apt archive $ARCHIVES: $(find "$ARCHIVES" -maxdepth 1 -name '*.deb' | wc -l | tr -d ' ') cached .deb files"

for attempt in 1 2 3; do
  if [ "$attempt" -gt 1 ]; then
    echo "Clearing what attempt $((attempt - 1)) left behind: a leftover apt-get, then dpkg --configure -a"
    : # MUTANT (#2981 measurement, reverted in the next commit): no clear before a retry
    timeout 60 sh -c "$REPAIR" || echo "::warning::dpkg --configure -a did not finish before attempt $attempt"
  fi
  # $INSTALL is split into words on purpose: it is a command line, not one argument.
  # shellcheck disable=SC2086
  if timeout "$BOUND" $INSTALL; then exit 0; fi
  echo "::warning::Chromium install attempt $attempt failed or ran past $BOUND seconds"
done
echo "::error::Chromium install timed out or failed after 3 attempts; the browser gates cannot run"
exit 1
