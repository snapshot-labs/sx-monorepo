// Oath is a native iOS wallet. AppKit handles its WalletConnect QR and app link.
export const OATH_WALLET = {
  id: '79f336977e239d92625bdecf3f2e20a2d8f9974b5fa884d23ec02c9b82e075ce',
  name: 'Oath Wallet',
  image_url: new URL('/oath-wallet.svg', window.location.origin).href,
  homepage: 'https://oathwallet.org',
  mobile_link: 'oathwallet://',
  app_store: 'https://apps.apple.com/app/id6780187283'
} as const;
