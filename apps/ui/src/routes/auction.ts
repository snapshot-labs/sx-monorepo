import AuctionOverview from '@/views/Auction/Overview.vue';
import AuctionVerify from '@/views/Auction/Verify.vue';
import Auction from '@/views/Auction.vue';
import AuctionInvite from '@/views/AuctionInvite.vue';
import Auctions from '@/views/Auctions.vue';

export default [
  {
    path: '/auctions',
    name: 'auctions',
    component: Auctions
  },
  {
    path: '/auction/invite/:auctionTag/:partner(0x[a-fA-F0-9]{40})',
    name: 'auction-invite',
    component: AuctionInvite
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
