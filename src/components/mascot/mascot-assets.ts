export type MascotMood =
  | "default"
  | "happy"
  | "thinking"
  | "working"
  | "celebrating"
  | "warning";

export interface MascotAssetConfig {
  mood: MascotMood;
  label: string;
  imagePath: string;
  defaultMessage: string;
}

export class MascotAssets {
  static getAsset(mood: MascotMood): MascotAssetConfig {
    switch (mood) {
      case "happy":
        return {
          mood: "happy",
          label: "Happy Nori",
          imagePath: "/mascot/happy.png",
          defaultMessage: "Awesome! We're making progress.",
        };
      case "thinking":
        return {
          mood: "thinking",
          label: "Thinking Nori",
          imagePath: "/mascot/thinking.png",
          defaultMessage: "Pondering the best automation path...",
        };
      case "working":
        return {
          mood: "working",
          label: "Working Nori",
          imagePath: "/mascot/working.png",
          defaultMessage: "Hard at work building your workflow!",
        };
      case "celebrating":
        return {
          mood: "celebrating",
          label: "Celebrating Nori",
          imagePath: "/mascot/celebrating.png",
          defaultMessage: "Woohoo! Workflow completed successfully!",
        };
      case "warning":
        return {
          mood: "warning",
          label: "Warning Nori",
          imagePath: "/mascot/warning.png",
          defaultMessage: "Something went wrong. Let's investigate.",
        };
      case "default":
      default:
        return {
          mood: "default",
          label: "Nori - AI Companion",
          imagePath: "/mascot/default.png",
          defaultMessage: "From ideas to action.",
        };
    }
  }
}
