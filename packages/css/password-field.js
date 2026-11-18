/*
 * @prism3/css — the password field's Show/Hide button (#3408 S3, owner decision Q86 A: native HTML plus a small
 * script; S4's element replaces it). Hand-written behavior, not generated: the def states it in prose, in
 * password-field's codeOnly entries (Q301.4 A, Q301.5 A, Q301.7 A), and this follows them.
 *
 *   <script src="@prism3/css/password-field.js" defer></script>
 *
 * - Before it runs, the button keeps its `hidden` attribute, so the field is a plain password input.
 * - Pressing the button switches the input between type="password" and type="text", keeps the caret where it was, and
 *   leaves focus on the button. Its visible text becomes "Hide" or "Show"; the visually hidden " password" completes its
 *   name. No aria-pressed: the changing name is the state.
 * - Each change is announced once in a polite live region: the page's own `[data-p3-announcer]` if it has one, else one
 *   this script adds.
 * - When the form submits, the field goes back to hidden, so a browser never stores the value as plain text.
 * - Every string can be set per button: data-p3-show, data-p3-hide, data-p3-shown, data-p3-hidden. The defaults are the
 *   def's (DRAFT, Q301.5).
 * - Inside a `<p3-password-field>` that has upgraded (`:defined`), the element owns the button and this script stands
 *   aside, so a page that loads both toggles once. Before the element's script runs, this one works the same markup.
 */
(() => {
  const TOGGLE = '.p3-password-field__toggle';
  const TEXT = { show: 'Show', hide: 'Hide', shown: 'Your password is shown', hidden: 'Your password is hidden' };
  /** A button the `<p3-password-field>` element owns: this script leaves it alone. */
  const owned = (button) => !!button.closest('p3-password-field:defined');
  const say = (button, key) => button.getAttribute(`data-p3-${key}`) || TEXT[key];

  let region;
  const announce = (message) => {
    region = region || document.querySelector('[data-p3-announcer]');
    if (!region) {
      region = document.createElement('div');
      region.className = 'p3-password-field__announcer';
      region.setAttribute('data-p3-announcer', '');
      region.setAttribute('role', 'status');
      document.body.append(region);
    }
    region.textContent = '';
    requestAnimationFrame(() => { region.textContent = message; });
  };

  const inputOf = (button) => document.getElementById(button.getAttribute('aria-controls') || '');
  // Chromium resets the caret of an input that has had focus one task after its type changes while it is blurred (a
  // click on the button blurs it), overwriting a restore made in the same task. So the caret is put back now, and
  // again after that task (#3921; `<p3-password-field>` does the same).
  const set = (button, input, shown) => {
    const start = input.selectionStart;
    const end = input.selectionEnd;
    input.type = shown ? 'text' : 'password';
    if (start !== null && end !== null) {
      input.setSelectionRange(start, end);
      setTimeout(() => input.setSelectionRange(start, end), 0);
    }
    const text = button.querySelector('.p3-password-field__toggle-text');
    if (text) text.textContent = say(button, shown ? 'hide' : 'show');
  };

  const enhance = (root = document) => {
    for (const button of root.querySelectorAll(TOGGLE)) if (!owned(button) && inputOf(button)) button.hidden = false;
  };

  document.addEventListener('click', (event) => {
    const button = event.target instanceof Element && event.target.closest(TOGGLE);
    if (!button || button.disabled || owned(button)) return;
    const input = inputOf(button);
    if (!input) return;
    const shown = input.type === 'password';
    set(button, input, shown);
    announce(say(button, shown ? 'shown' : 'hidden'));
  });

  document.addEventListener('submit', (event) => {
    const form = event.target;
    if (!(form instanceof HTMLFormElement)) return;
    for (const button of form.querySelectorAll(TOGGLE)) {
      const input = inputOf(button);
      if (!owned(button) && input && input.type === 'text') set(button, input, false);
    }
  }, true);

  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', () => enhance());
  else enhance();
  window.p3PasswordField = { enhance };
})();
