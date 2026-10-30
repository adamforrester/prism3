---
engine: minor
---
BrandMark is ProviderLogo (#3148, owner decision Q847 A): the def `brand-mark` is `provider-logo`, display name "Provider logo", and its Figma components are `provider-logo/<kind>/<name>`. The marks are third-party providers' logos, not the design system's own brand. `COMPONENT_RENAMES` records the rename, so Update file renames the components of a file built before it in place, each keeping its id and every instance placed from it. WalletButton, CardNumberField and SignInButton nest the new name. The vocabulary modules are `provider-logo-glyphs.ts` and `provider-logo-set.ts`, their exports `PROVIDER_LOGO_*`, and the coded names `ProviderLogo`, `ProviderLogoName` and `ProviderLogoProvider`. No token name moves, so `CONTRACT_VERSION` stays.
