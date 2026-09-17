export type MascotMood =
  | "default"
  | "happy"
  | "excited"
  | "thinking"
  | "working"
  | "celebrating"
  | "confused"
  | "warning"
  | "sad"
  | "searching"
  | "teaching"
  | "architect"
  | "debugging"
  | "optimizing";

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
      case "excited":
        return {
          mood: "excited",
          label: "Excited Nori",
          imagePath: "/mascot/happy.png",
          defaultMessage: "I can't wait to run this workflow!",
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
      case "confused":
        return {
          mood: "confused",
          label: "Confused Nori",
          imagePath: "/mascot/warning.png",
          defaultMessage: "Hmm, I'm not quite sure about this setup.",
        };
      case "warning":
        return {
          mood: "warning",
          label: "Warning Nori",
          imagePath: "/mascot/warning.png",
          defaultMessage: "Something went wrong. Let's investigate.",
        };
      case "sad":
        return {
          mood: "sad",
          label: "Sad Nori",
          imagePath: "/mascot/warning.png",
          defaultMessage: "Oh no, execution failed.",
        };
      case "searching":
        return {
          mood: "searching",
          label: "Searching Nori",
          imagePath: "/mascot/thinking.png",
          defaultMessage: "Searching available templates and node specs...",
        };
      case "teaching":
        return {
          mood: "teaching",
          label: "Teaching Nori",
          imagePath: "/mascot/default.png",
          defaultMessage: "Let me show you how to build automations!",
        };
      case "architect":
        return {
          mood: "architect",
          label: "Architect Nori",
          imagePath: "/mascot/thinking.png",
          defaultMessage: "Designing your workflow architecture...",
        };
      case "debugging":
        return {
          mood: "debugging",
          label: "Debugging Nori",
          imagePath: "/mascot/warning.png",
          defaultMessage: "Analyzing execution logs to fix the error...",
        };
      case "optimizing":
        return {
          mood: "optimizing",
          label: "Optimizing Nori",
          imagePath: "/mascot/working.png",
          defaultMessage: "Refining nodes for maximum speed and lower costs!",
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
