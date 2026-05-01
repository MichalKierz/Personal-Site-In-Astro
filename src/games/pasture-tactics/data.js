export const MAX_TURNS = 20;
export const EVENT_SLOTS = 5;

export const ANIMALS = [
  {
    key: "chickens",
    name: "Chickens",
    singular: "Chicken",
    icon: "🐔",
    value: 1,
    cullScore: 3,
  },
  {
    key: "sheep",
    name: "Sheep",
    singular: "Sheep",
    icon: "🐑",
    value: 2,
    cullScore: 10,
  },
  {
    key: "pigs",
    name: "Pigs",
    singular: "Pig",
    icon: "🐖",
    value: 5,
    cullScore: 25,
  },
  {
    key: "cows",
    name: "Cows",
    singular: "Cow",
    icon: "🐄",
    value: 12,
    cullScore: 150,
  },
];

export const ANIMAL_BY_KEY = Object.fromEntries(
  ANIMALS.map((animal) => [animal.key, animal])
);

export const ACTION_POOL = [
  {
    id: "breed-chickens",
    title: "Breed Chickens",
    detail: "One new chicken per pair",
    type: "breed",
    animal: "chickens",
  },
  {
    id: "breed-sheep",
    title: "Breed Sheep",
    detail: "One new sheep per pair",
    type: "breed",
    animal: "sheep",
  },
  {
    id: "breed-pigs",
    title: "Breed Pigs",
    detail: "One new pig per pair",
    type: "breed",
    animal: "pigs",
  },
  {
    id: "breed-cows",
    title: "Breed Cows",
    detail: "One new cow per pair",
    type: "breed",
    animal: "cows",
  },
  {
    id: "adopt-chicken",
    title: "Adopt Chicken",
    detail: "Gain 1 chicken",
    type: "adopt",
    animal: "chickens",
  },
  {
    id: "adopt-sheep",
    title: "Adopt Sheep",
    detail: "Gain 1 sheep",
    type: "adopt",
    animal: "sheep",
  },
  {
    id: "trade-chickens-sheep",
    title: "Trade Up",
    detail: "2 chickens → 1 sheep",
    type: "trade",
    costs: {
      chickens: 2,
    },
    rewards: {
      sheep: 1,
    },
  },
  {
    id: "trade-sheep-pig",
    title: "Trade Up",
    detail: "2 sheep → 1 pig",
    type: "trade",
    costs: {
      sheep: 2,
    },
    rewards: {
      pigs: 1,
    },
  },
  {
    id: "trade-pigs-cow",
    title: "Trade Up",
    detail: "2 pigs → 1 cow",
    type: "trade",
    costs: {
      pigs: 2,
    },
    rewards: {
      cows: 1,
    },
  },
  {
    id: "trade-sheep-chickens",
    title: "Trade Down",
    detail: "1 sheep → 3 chickens",
    type: "trade",
    costs: {
      sheep: 1,
    },
    rewards: {
      chickens: 3,
    },
  },
  {
    id: "trade-pig-mix",
    title: "Trade Down",
    detail: "1 pig → 2 sheep + 1 chicken",
    type: "trade",
    costs: {
      pigs: 1,
    },
    rewards: {
      sheep: 2,
      chickens: 1,
    },
  },
  {
    id: "trade-cow-mix",
    title: "Trade Down",
    detail: "1 cow → 2 pigs + 1 chicken",
    type: "trade",
    costs: {
      cows: 1,
    },
    rewards: {
      pigs: 2,
      chickens: 1,
    },
  },
  {
    id: "cull-chickens",
    title: "Cull Chickens",
    detail: "Kill all chickens for +3 score each",
    type: "cull",
    animal: "chickens",
  },
  {
    id: "cull-sheep",
    title: "Cull Sheep",
    detail: "Kill all sheep for +10 score each",
    type: "cull",
    animal: "sheep",
  },
  {
    id: "cull-pigs",
    title: "Cull Pigs",
    detail: "Kill all pigs for +25 score each",
    type: "cull",
    animal: "pigs",
  },
  {
    id: "cull-cows",
    title: "Cull Cows",
    detail: "Kill all cows for +150 score each",
    type: "cull",
    animal: "cows",
  },
];

export const EVENT_POOL = [
  {
    id: "quiet-day",
    title: "Quiet Day",
    detail: "Nothing happens",
    type: "none",
  },
  {
    id: "fertile-day",
    title: "Fertile Day",
    detail: "All pairs of animals reproduce",
    type: "blessing",
  },
  {
    id: "fox",
    title: "Fox",
    detail: "Eats half of your chickens",
    type: "fox",
    rounding: "ceil",
    target: "chickens",
    fraction: 0.5,
  },
  {
    id: "wolf",
    title: "Wolf",
    detail: "Kills 1 sheep and 1 pig",
    type: "wolf",
    losses: {
      sheep: 1,
      pigs: 1,
    },
  },
  {
    id: "bear",
    title: "Bear",
    detail: "Kills 1 cow",
    type: "bear",
    losses: {
      cows: 1,
    },
  },
  {
    id: "flood",
    title: "Flood",
    detail: "Removes one of each animal",
    type: "flood",
    losses: {
      chickens: 1,
      sheep: 1,
      pigs: 1,
      cows: 1,
    },
  },
];