export interface video {
  heading: string;
  data: videos[];
}
export interface videos {
  url: string;
  youtubeUrl: string;
  title: string;
  rating: number;
  votes: number;
  type: string;
}

export const videosData: video[] = [
  {
    heading: "About 6,000 results (0.60 seconds)",
    data: [
      {
        url: "https://themeforest.net/user/pixelstrap/portfolio",
        youtubeUrl: "https://www.youtube.com/embed/CJnfAXlBRTE",
        title:
          "Koho introduces a IELTS Coaching, TOEFL Coaching, GRE Coaching.",
        rating: 3,
        votes: 590,
        type: "Theme",
      },
      {
        url: "https://themeforest.net/user/pixelstrap/portfolio",
        youtubeUrl: "https://www.youtube.com/embed/wpmHZspl4EM",
        title:
          "Tivo introduces a IELTS Coaching, TOEFL Coaching, GRE Coaching.",
        rating: 3,
        votes: 590,
        type: "Theme",
      },
      {
        url: "https://themeforest.net/user/pixelstrap/portfolio",
        youtubeUrl: "https://www.youtube.com/embed/-L4gEk7cOfk",
        title:
          "Dunzo introduces a IELTS Coaching, TOEFL Coaching, GRE Coaching.",
        rating: 3,
        votes: 590,
        type: "Theme",
      },
    ],
  },
  {
    heading: "About 6,000 results (0.60 seconds)",
    data: [
      {
        url: "https://themeforest.net/user/pixelstrap/portfolio",
        youtubeUrl: "https://www.youtube.com/embed/CJnfAXlBRTE",
        title:
          "Enzo introduces a IELTS Coaching, TOEFL Coaching, GRE Coaching.",
        rating: 3,
        votes: 590,
        type: "Theme",
      },
      {
        url: "https://themeforest.net/user/pixelstrap/portfolio",
        youtubeUrl: "https://www.youtube.com/embed/-L4gEk7cOfk",
        title: "Morbi eget quam et purus commodo dapibus.",
        rating: 3,
        votes: 590,
        type: "Theme",
      },
      {
        url: "https://themeforest.net/user/pixelstrap/portfolio",
        youtubeUrl: "https://www.youtube.com/embed/wpmHZspl4EM",
        title:
          "Tivo introduces a IELTS Coaching, TOEFL Coaching, GRE Coaching.",
        rating: 3,
        votes: 590,
        type: "Theme",
      },
    ],
  },
];
