// The toolkit page, in two tiers. `shipped` is what a project on this site
// was built with: each row names that project (by its file name in
// src/content/projects/) and lists what it was used with. `studied` is
// coursework, said as coursework. `icon` names a drawing in icons.ts; leave
// it empty for none.

export interface ShippedRow {
  name: string;
  icon: string;
  /** The project that proves it, as its write-up's file name. */
  project?: string;
  /** A fact after the project's name, or on its own. */
  note: string;
  with: string[];
}
export interface StudiedRow {
  name: string;
  icon: string;
  note: string;
}

export const toolkit = {
  blurb: "What I have built with, and what I have studied.",
  shippedTitle: "Built and shipped with",
  studiedTitle: "Studied in coursework",
};

export const shipped: ShippedRow[] = [
  {
    name: "Python",
    icon: "python",
    project: "prostate-mri-dashboard",
    note: "1,500 MRI cases",
    with: [
      "Streamlit",
      "NumPy",
      "Nibabel",
      "MONAI",
      "nnU-Net",
      "SwinUNETR",
      "U-Net++",
      "Plotly",
      "PyTest"
    ]
  },
  {
    name: "PHP + SQL",
    icon: "php",
    project: "music-musingsv2",
    note: "graded 96%",
    with: [
      "Laravel",
      "Livewire",
      "Eloquent ORM",
      "MySQL",
      "Blade templates",
      "Tailwind CSS",
      "Spotify Web API"
    ]
  },
  {
    name: "Tooling",
    icon: "docker",
    note: "Both projects",
    with: [
      "Git",
      "Docker",
      "Unit testing"
    ]
  }
];

export const studied: StudiedRow[] = [
  {
    name: "Machine learning",
    icon: "svm",
    note: "Big Data and Machine Learning, 88%: regression, random forests, PCA, CNNs, Vision Transformers, image segmentation"
  },
  {
    name: "Java",
    icon: "java",
    note: "Programming fundamentals, Spring Boot, RESTful web services, software engineering coursework"
  },
  {
    name: "C / C++",
    icon: "cpp",
    note: "Advanced object-oriented programming"
  },
  {
    name: "Ada",
    icon: "ada",
    note: "Critical Systems, 81%: SPARK Ada, Hoare logic, formal correctness"
  }
];
