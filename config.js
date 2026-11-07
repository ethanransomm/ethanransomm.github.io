window.SITE = {
  // ---- Basics --------------------------------------------------------------
  name: "Ethan Ransom",
  role: "BSc Computer Science, First Class Honours, Bristol",

  // Browser tab title and search description.
  title: "Ethan Ransom | Computer Science Graduate",
  description:
    "I'm a First Class Computer Science graduate from Swansea University, based near Bristol. Machine learning for medical imaging, and data-heavy interfaces that non-specialists can read.",

  // ---- Look and feel ----------------------------------------------------
  theme: {
    palette: "layer",
    accent: "",
    fontUrl:
      "https://fonts.googleapis.com/css2?family=JetBrains+Mono:ital,wght@0,100..800;1,100..800&display=swap",
    // JetBrains Mono Nerd Font is a local install, not a webfont, so the
    // stack asks for it first and falls back to the metrically identical
    fontBody: "",
    fontHeading: "",
    fontDisplay: "",
  },

  // ---- About ---------------------------------------------------------------
  about: {
    paragraphs: [
      "I'm a First Class Computer Science graduate from Swansea University, based near Bristol. I like solving problems where the difficulty lies in the interdisciplinary nature of a problem, exponentially increasing how much knowledge you can gain throughout the process.",
      "I exercised this pursuit through my dissertation, combining medicine and computer science: training a Vision Transformer and a nested CNN on the PI-CAI dataset which contains 1,500 prostate MRI cases. I then built a dashboard to visualise the model outcomes and compare each model's decision. This enables a clinician to inspect where the model and ground truth disagree. Before completing my dissertation I built a music review platform in Laravel, which became the module I attained the highest marks for in my bachelor's degree.",
    ],
  },

  // ---- Projects ------------------------------------------------------------
  projects: [
    {
      title: "Prostate Cancer Detection Dashboard",
      summary:
        "An interactive dashboard for comparing three deep-learning architectures (nnU-Net, SwinUNETR and U-Net++) on clinically significant prostate cancer detection, voxel by voxel, against expert ground truth on the PI-CAI dataset.",
      image: "assets/prostate-performance.webp",
      imageAlt:
        "The dashboard's performance tab for one patient: AUROC 78.11% and average precision 46.17% above a four-quadrant confusion matrix and a filled ROC curve with AUC 0.781.",
      imageCaption: "Performance analysis: confusion matrix and ROC curve",
      imageRatio: "2.2 / 1",
      imageFit: "contain",
      gallery: [
        {
          src: "assets/prostate-slice-viewer.webp",
          alt: "The slice viewer showing four side-by-side MRI panels (T2 with heatmap, ADC, DWI and a lesion zoom), each with the model's red predicted boundary and the green ground-truth outline, above a slice slider.",
          caption:
            "Slice viewer: T2, ADC and DWI with prediction and ground truth",
        },
        {
          src: "assets/prostate-diagnostics.webp",
          alt: "The diagnostics tab: a table of AUROC, average precision, case counts and false positives for folds 0 to 4, the ensemble, SwinUNETR and U-Net++, above a grouped bar chart of AUROC and average precision.",
          caption: "Diagnostics: every fold and architecture compared",
        },
        {
          graph: "mri-arch",
          alt: "Architecture of the dashboard: the sidebar feeds app.py, which renders three tabs. The tabs read scans through data_utils.py, metrics from JSON files and fold results from a CSV, using SciPy, NumPy, Matplotlib, Streamlit and Plotly.",
          caption:
            "Architecture: how the app, its tabs and the data fit together",
        },
      ],
      diagram: "cspca",
      context: "Final year dissertation, graded First Class",
      highlights: [
        "Adapted nnU-Net's preprocessing and data pipeline so SwinUNETR and U-Net++ could be trained from scratch on identical inputs, matching its per-channel z-score normalisation for a like-for-like comparison.",
        "Handled 1,500 patients' 3D bi-parametric MRI volumes with Nibabel and NumPy across T2, ADC and DWI.",
        "Compared a hybrid Vision Transformer against a deeply supervised nested CNN on how each localises and diagnoses lesions.",
        "Built the Streamlit dashboard around a 3D slice viewer, interactive ROC curves and confusion matrices, so clinical stakeholders can explore the results without reading code.",
      ],
      feature: {
        title: "Slice viewer",
        text: "The scan explorer shows the T2, ADC and DWI modalities side by side, with the model's probability heatmap, its predicted lesion boundary and the expert ground-truth mask laid over them. A fourth panel zooms in on the predicted lesion.",
        points: [
          "A slider steps through the slices, and the ground-truth and prediction layers can each be switched off.",
          "An inspector above the images reports the model's maximum confidence for the case and whether the expert label is positive.",
          "Erosion, dilation and zoom run through SciPy and NumPy, the heatmap colouring through Matplotlib, and the slice animation through Plotly.",
        ],
      },
      outcome:
        "The nnU-Net ensemble had the best average precision, 0.462 against 0.309 for SwinUNETR and 0.266 for U-Net++. U-Net++ raised the most false alarms, 4.86 per case against 3.16 for the ensemble. That is the kind of trade-off a single AUROC hides.",
      tech: [
        "Python",
        "Streamlit",
        "Plotly",
        "NumPy",
        "Nibabel",
        "nnU-Net",
        "MONAI",
        "PyTest",
        "Docker",
      ],
      links: [
        {
          label: "Source code",
          url: "https://github.com/ethanransomm/prostate-mri-dashboard",
        },
        { label: "Live demo", url: "" }, // TODO: add link when it's live on Streamlit Community Cloud
      ],
      note: "Research and educational tool, not a medical device, and not for clinical decision-making.",
    },
    {
      title: "Music Musings",
      summary:
        "A music review platform in the vein of Rate Your Music, rebuilt around the parts of RYM I found awkward. Browse a Spotify-seeded library, rate albums out of 10, and argue about them in the forum.",
      image: "assets/music-musings-home.webp",
      imageFit: "contain",
      imageAlt:
        "The Music Musings home page: the wordmark in white and violet on near-black, above a 'Dive In' button and a Featured Albums row.",
      context: "Web Application Development, CSC-348, graded 96%",
      gallery: [
        {
          src: "assets/music-musings-albums.webp",
          alt: "The All Albums page, showing a searchable grid of album covers with artist, genre tag and release year.",
          caption: "Album library, 193 releases, searchable",
        },
        {
          src: "assets/music-musings-album.webp",
          alt: "An album page for 'loveless' by my bloody valentine, with cover art, release date, genre and a full track listing with durations.",
          caption: "Album page with Spotify track listing",
        },
        {
          src: "assets/music-musings-review.webp",
          alt: "A review page showing a 5/10 score, a written musing, and a threaded comment from an admin user.",
          caption: "Reviews, scores and threaded comments",
        },
        {
          src: "assets/music-musings-artists.webp",
          alt: "The Artists page, a grid of circular artist portraits each with an album count.",
          caption: "Artist directory seeded from Spotify",
        },
        {
          graph: "mm-erd",
          alt: "Database schema: artists, albums, songs, users, profiles, favourites, reviews and comments. An artist has many albums and songs, an album has many songs, favourites and reviews, a user has one profile and many favourites, reviews and comments, and a review has many comments.",
          caption: "Database schema: eight tables and how they relate",
        },
      ],
      highlights: [
        "Laravel on an MVC architecture, with Eloquent modelling the relationships between artists, albums, songs, users and reviews.",
        "Wrapped the Spotify Web API in a service registered on Laravel's container, so token handling stays out of the controllers. A custom seeder used it to populate 20 artists and 193 releases with real artwork and track listings.",
        "Accounts and favourites, a community forum of recent reviews, and admin moderation of comments.",
        "Evaluated against WCAG 2 with alt text throughout and colour contrast passing AA and AAA.",
      ],
      outcome:
        "The highest grade I attained during my degree, at 96%. Seeding from a live API is very satisfying until the API refuses to connect to your site, blocking the database from being populated. Next time I would cache the Spotify responses after the first retrieval, so I never have to repopulate from scratch every time I want to launch the site.",
      tech: [
        "Laravel",
        "PHP",
        "Livewire",
        "Tailwind CSS",
        "Eloquent ORM",
        "Spotify Web API",
        "Docker",
        "MySQL",
      ],
      links: [
        {
          label: "Source code",
          url: "https://github.com/ethanransomm/music-musingsv2",
        },
      ],
    },
  ],

  // ---- Toolkit -------------------------------------------------------------
  toolkit: {
    blurb: "What I reach for, and where I have actually used it.",
    languages: [
      {
        name: "Python",
        icon: "python",
        note: "Dissertation pipeline, Streamlit, NumPy",
      },
      { name: "SQL", icon: "sql", note: "Database Systems, Eloquent schemas" },
      { name: "PHP", icon: "php", note: "Laravel backend for Music Musings" },
      { name: "Java", icon: "java", note: "Software Engineering coursework" },
      {
        name: "C++",
        icon: "cpp",
        note: "Advanced Object Oriented Programming",
      },
      { name: "C", icon: "c", note: "Advanced Object Oriented Programming" },
      {
        name: "HTML",
        icon: "html",
        note: "Every front end here and at university",
      },
      { name: "CSS", icon: "css", note: "Tailwind in Laravel, plain CSS here" },
      {
        name: "Ada",
        icon: "ada",
        note: "Critical Systems, formal correctness",
      },
    ],
    groups: [
      {
        title: "Machine learning",
        items: [
          "Deep learning",
          "CNNs",
          "Vision Transformers",
          "Image segmentation",
          "nnU-Net",
          "SwinUNETR",
          "U-Net++",
          "MONAI",
          "Model benchmarking",
        ],
      },
      {
        title: "Medical imaging",
        items: [
          "Bi-parametric MRI",
          "DICOM",
          "NIfTI",
          "Nibabel",
          "Image analysis",
          "Segmentation",
        ],
      },
      {
        title: "Data and visualisation",
        items: [
          "NumPy",
          "Streamlit",
          "Plotly",
          "Spark",
          "Data preprocessing",
          "Clinical data analytics",
        ],
      },
      {
        title: "Web and engineering",
        items: [
          "Laravel",
          "Livewire",
          "Tailwind CSS",
          "REST APIs",
          "Git",
          "Docker",
          "Unit testing",
          "System design",
        ],
      },
    ],
  },

  // ---- Background ----------------------------------------------------------
  timeline: [
    {
      when: "Sep 2022 to Jun 2026",
      title: "BSc Computer Science, First Class Honours",
      place: "Swansea University",
      detail:
        "72.83% average. Highest marks in Web Application Development (96%), Big Data and Machine Learning (88%), Critical Systems (81%), Visual Computing (73%) and Intelligent Robotics (73%). Dissertation modules: Specification and Planning Document 75%, PowerPoint Presentation 77%, Dissertation 75%, Project Fair Poster Presentation 82%.",
      tags: ["Dissertation: 75%", "Project fair: 82%"],
    },
    {
      when: "Jun to Oct 2024",
      title: "Waiter",
      place: "Tiffin At The Beach, Clevedon",
      detail:
        "Busy service periods, several tables and orders at once, coordinating with the kitchen to keep things moving. Good practice at staying calm and keeping track of state under load.",
      tags: [],
    },
    {
      when: "Sep 2020 to Jun 2022",
      title: "BTEC Level 3 Extended Diploma in Computing",
      place: "City of Bristol College",
      detail: "Graded DDD*, highest grade possible.",
      tags: ["DDD*"],
    },
    {
      when: "Sep 2015 to Jun 2020",
      title: "GCSEs",
      place: "Gordano School, Portishead",
      detail:
        "Combined Science 6-6, Computer Science 5, Geography 5, French 5, Mathematics 4, and English Language and English Literature 4.",
      tags: [],
    },
  ],

  // ---- Right now -----------------------------------------------------------
  now: {
    learning: [
      "Setting up the prostate dashboard for deployment on Streamlit's Community Cloud",
      "Developing my understanding of Machine Learning Ops and how to deploy models in production",
      "Building side projects to strengthen my portfolio",
    ],
    nextUp: {
      title: "Building a miniature version of ChatGPT in Python",
      description:
        "A small-scale chatbot that uses a pre-trained language model to generate responses to user input, with a focus on understanding the underlying architecture and fine-tuning techniques.",
      status: "In progress",
    },
  },

  // ---- Personality ---------------------------------------------------------
  // Heading above the interests list.
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

  // ---- Contact -------------------------------------------------------------
  contact: {
    blurb:
      "I'm currently searching & applying for graduate software, data analytics and ML engineering roles.",
    email: "ethanransom271@gmail.com",
    emailLabel: "Start a conversation",
    links: [
      { label: "GitHub", url: "https://github.com/ethanransomm" },
      {
        label: "LinkedIn",
        url: "https://www.linkedin.com/in/ethan-ransom-58455a257/",
      },
      { label: "CV", url: "cv.pdf" },
    ],
  },

  // ---- Side rails ----------------------------------------------------------
  // 'edgeArt' is the level metre on the left and right is the page.
  edgeArt: true,

  // ---- Small touches -------------------------------------------------------
  easterEgg: true, // try the Konami code on the page
  consoleMessage:
    "Hello, curious one. Try the Konami code: up up down down left right left right b a",
};
