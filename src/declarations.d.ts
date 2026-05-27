declare module "react-native-sound" {
  class Sound {
    static setCategory(category: string): void;
    static MAIN_BUNDLE: string;
    constructor(
      filename: string,
      basePath: string,
      onError?: (error: any) => void
    );
    play(onEnd?: (success: boolean) => void): this;
    stop(): this;
    release(): void;
    setVolume(value: number): this;
  }
  export default Sound;
}
