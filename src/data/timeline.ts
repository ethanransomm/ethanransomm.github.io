// The background page: education and work, newest first.
//
// `minor: true` collapses an entry to one line (title, place and dates). Its
// `detail` stays here but is not shown; remove the flag to expand it.
// `marks` draws module marks as bars out of 100, highest first.

export interface TimelineEntry {
  when: string;
  title: string;
  place: string;
  detail: string;
  minor?: boolean;
  marks?: { label: string; value: number }[];
  tags?: string[];
}

export const timeline: TimelineEntry[] = [
  {
    when: "Sep 2022 to Jun 2026",
    title: "BSc Computer Science, First Class Honours",
    place: "Swansea University",
    detail: "72.83% average.",
    marks: [
      {
        label: "Web Application Development",
        value: 96
      },
      {
        label: "Big Data and Machine Learning",
        value: 88
      },
      {
        label: "Project fair poster presentation",
        value: 82
      },
      {
        label: "Critical Systems",
        value: 81
      },
      {
        label: "Dissertation",
        value: 75
      }
    ]
  },
  {
    when: "Jun to Oct 2024",
    title: "Waiter",
    place: "Tiffin At The Beach, Clevedon",
    detail: "Busy service periods, several tables and orders at once, coordinating with the kitchen to keep things moving. Good practice at staying calm and keeping track of state under load.",
    minor: true
  },
  {
    when: "Sep 2020 to Jun 2022",
    title: "BTEC Level 3 Extended Diploma in Computing",
    place: "City of Bristol College",
    detail: "Graded DDD*, highest grade possible.",
    tags: [
      "DDD*"
    ]
  },
  {
    when: "Sep 2015 to Jun 2020",
    title: "GCSEs",
    place: "Gordano School, Portishead",
    detail: "Combined Science 6-6, Computer Science 5, Geography 5, French 5, Mathematics 4, and English Language and English Literature 4.",
    minor: true
  }
];
