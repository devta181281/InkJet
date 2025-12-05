// Navigation type definitions for the app
export type RootStackParamList = {
    Home: undefined;
    Styling: { text: string };
    Output: { images: string[] };
};

// Declare module augmentation for React Navigation
declare global {
    namespace ReactNavigation {
        interface RootParamList extends RootStackParamList { }
    }
}
