import AuctionIncoming from '@/views/Auction/Incoming.vue';
import AuctionOverview from '@/views/Auction/Overview.vue';
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
      { path: '', name: 'auction-overview', component: AuctionOverview }
    ]
  },
  {
    path: '/auction/incoming/:id',
    name: 'auction-incoming',
    component: AuctionIncoming
  }
];
