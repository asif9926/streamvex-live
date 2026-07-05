// highlights.js — Highlights / Event Videos / Best Performances / Player Skills
// Blueprint: src/data/highlights.js
//
// ✅ নতুন ভিডিও যুক্ত করা এক্কেবারে সহজ — নিচের লিস্টে একটা নতুন { } ব্লক বসান:
//
//   {
//     id:         5,                                             // আগের সবচেয়ে বড় id + 1
//     title:      'আপনার ভিডিওর নাম এখানে লিখুন',
//     youtubeUrl: 'https://www.youtube.com/watch?v=XXXXXXXXXXX',  // যেকোনো YouTube লিংক ফরম্যাট চলবে
//     addedDate:  '2026-07-05',                                   // YYYY-MM-DD — আজকের তারিখ
//   },
//
// থাম্বনেইল/ডিউরেশন কিছুই বসাতে হবে না — সবকিছু youtubeUrl থেকে automatic বের হয়।
// এই লিস্টের যেকোনো জায়গায় নতুন ব্লক বসাতে পারেন, ক্রম নিয়ে ভাবতে হবে না —
// পেজে নিজে থেকেই তারিখ অনুযায়ী সাজানো হবে (সবচেয়ে নতুনটা সবার আগে)।
// ভিডিও মুছে ফেলতে চাইলে শুধু সেই { } ব্লকটা ডিলিট করে দিন।
//
// youtubeUrl-এ এসব ফরম্যাটের যেকোনোটা কাজ করবে:
//   https://www.youtube.com/watch?v=XXXXXXXXXXX
//   https://youtu.be/XXXXXXXXXXX
//   https://www.youtube.com/shorts/XXXXXXXXXXX
//   https://www.youtube.com/embed/XXXXXXXXXXX

const highlights = [
  {
    id:         1,
    title:      'Highlights | Canada vs Morocco | Match 89 | Round of 16 | FIFA World Cup 2026™',
    youtubeUrl: 'https://www.youtube.com/watch?v=IKp3tUGAEGQ',
    addedDate:  '2026-06-20',
  },
  {
    id:         2,
    title:      'World Cup Rematch: Portugal 3-3 Spain | 2018 Masterclass',
    youtubeUrl: 'https://www.youtube.com/watch?v=ZbM-tVTnRO8',
    addedDate:  '2026-06-25',
  },
  {
    id:         3,
    title:      'ICC Women\'s T20 World Cup 2026 Final: England vs Australia(Bengali)',
    youtubeUrl: 'https://www.youtube.com/watch?v=9MAdUJIsSgM',
    addedDate:  '2026-06-30',
  },
  {
    id:         4,
    title:      'Highlights | Paraguay vs France | Match 90 | Round of 16 | FIFA World Cup 2026™',
    youtubeUrl: 'https://www.youtube.com/watch?v=Lpz3nOGqwGE',
    addedDate:  '2026-07-05',
  },
]

export default highlights
