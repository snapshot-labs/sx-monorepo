import AuctionOverview from '@/views/Auction/Overview.vue';
import AuctionVerify from '@/views/Auction/Verify.vue';
import AuctionVerifyWithProvider from '@/views/Auction/VerifyWithProvider.vue';
import Auction from '@/views/Auction.vue';
import Auctions from '@/views/Auctions.vue';

export default [
  {
    path: '/auctions',
    name: 'auctions',
    component: Auctions
  },
  {
    path: '/auction/:id',
    name: 'auction',
    component: Auction,
    children: [
      { path: '', name: 'auction-overview', component: AuctionOverview },
      { path: 'verify', name: 'auction-verify', component: AuctionVerify },
      {
        path: 'verify-zkpassport',
        name: 'auction-verify-zkpassport',
        component: AuctionVerifyWithProvider,
        props: { provider: 'zkpassport' }
      },
      {
        path: 'verify-sumsub',
        name: 'auction-verify-sumsub',
        component: AuctionVerifyWithProvider,
        props: { provider: 'sumsub' }
      }
    ]
  }
];
