import AuctionOverview from '@/views/Auction/Overview.vue';
import AuctionVerify from '@/views/Auction/Verify.vue';
import Auction from '@/views/Auction.vue';
import Auctions from '@/views/Auctions.vue';

export default [
  {
    path: '/auctions',
    name: 'auctions',
    component: Auctions
  },
  {
    path: '/auction/verify',
    name: 'auction-verify-standalone',
    component: AuctionVerify
  },
  {
    path: '/auction/:id',
    name: 'auction',
    component: Auction,
    children: [
      { path: '', name: 'auction-overview', component: AuctionOverview },
      { path: 'verify', name: 'auction-verify', component: AuctionVerify }
    ]
  }
];
