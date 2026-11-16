// Who the site is about, and how it is navigated. Every layout and component
// reads from here, so a name, a link or a page label is written once.
// Project write-ups live in src/content/projects/, not in this file.

const email = "ethanransom271@gmail.com";

export const site = {
  name: "Ethan Ransom",
  role: "BSc Computer Science, First Class Honours, Bristol",

  // One sentence under the name: what you do, not who you are.
  tagline:
    "I develop machine learning models, data-heavy interfaces and web applications; my dissertation applied them to medical imaging and healthcare.",

  // Browser tab title and search description for the home page. Other pages
  // put their own name in front of yours.
  title: "Ethan Ransom | Computer Science Graduate",
  description:
    "I'm a First Class Computer Science graduate from Swansea University, based near Bristol. Machine learning for medical imaging, and data-heavy interfaces that non-specialists can read.",

  // What the link preview says the picture shows.
  previewAlt:
    "The top of Ethan Ransom's portfolio: his name in white and green on a dark terminal-style page with a one-line summary and two buttons, beside four MRI scans from his dissertation dashboard and its results.",

  contact: {
    blurb:
      "I'm currently applying for graduate software, data analytics and ML engineering roles.",
    email,
    // The text on the email button, wherever it appears.
    emailLabel: "Email me",
  },

  // The CV and the profiles. They ride the status bar on every page and
  // appear again as buttons on the contact page.
  links: [
    { label: "CV", href: "/cv.pdf" },
    { label: "GitHub", href: "https://github.com/ethanransomm" },
    {
      label: "LinkedIn",
      href: "https://www.linkedin.com/in/ethan-ransom-58455a257/",
    },
  ],

  // The tmux-style bar: the name in brackets on the left, and the text
  // beside the clock on the right.
  statusBar: { session: "ethan", right: "bristol" },
} as const;

// The About section on the home page: the paragraphs, then the chips
// beside them.
export const about = {
  paragraphs: [
    "I'm a First Class Computer Science graduate from Swansea University, based near Bristol. I like solving problems where the difficulty lies in their interdisciplinary nature, significantly increasing how much knowledge you can gain throughout the process.",
    "I exercised this pursuit through my dissertation, combining medicine and computer science: training a Vision Transformer and a nested CNN on the PI-CAI dataset, which contains 1,500 prostate MRI cases. I then built a dashboard to visualise the model outcomes and compare each model's decision. This enables a clinician to inspect where the model and ground truth disagree. Before completing my dissertation I built a music review platform in Laravel, for the module in which I attained the highest mark of my bachelor's degree.",
  ],
  interestsTitle: "Outside of Programming",
  interests: [
    "Niche music subgenres",
    "Concerts & live music",
    "Indie games",
    "Medicine & Healthcare",
    "Pharmacology",
    "Psychiatry",
    "Philosophy",
    "Literature",
    "Politics",
    "Pokémon",
  ],
} as const;

// The pages, in the order the status bar numbers them. `title` is what goes
// in the browser tab; the home page uses the site title instead.
export const pages = [
  { id: "about", label: "about", href: "/", title: "" },
  { id: "projects", label: "projects", href: "/projects/", title: "Projects" },
  { id: "toolkit", label: "toolkit", href: "/toolkit/", title: "Toolkit" },
  {
    id: "background",
    label: "background",
    href: "/background/",
    title: "Background",
  },
  { id: "contact", label: "contact", href: "/contact/", title: "Contact" },
] as const;

export type PageId = (typeof pages)[number]["id"];

export function isExternal(href: string): boolean {
  return /^https?:\/\//i.test(href);
}
