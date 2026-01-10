import AuctionOverview from '@/views/Auction/Overview.vue';
import AuctionUpcoming from '@/views/Auction/Upcoming.vue';
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
    path: '/auction/upcoming/:id',
    name: 'auction-upcoming',
    component: AuctionUpcoming
  }
];
