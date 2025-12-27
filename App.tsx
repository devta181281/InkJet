import React from 'react';
import { NavigationContainer } from '@react-navigation/native';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import HomeScreen from './src/screens/HomeScreen';
import OutputScreen from './src/screens/OutputScreen';
import StylingScreen from './src/screens/StylingScreen';
import { ThemeProvider } from './src/context/ThemeContext';
import { WebViewProvider } from './src/context/WebViewContext';
import ErrorBoundary from './src/components/ErrorBoundary';

const Stack = createNativeStackNavigator();

function App() {
  return (
    <ErrorBoundary>
      <SafeAreaProvider>
        <ThemeProvider>
          <WebViewProvider>
            <NavigationContainer>
              <Stack.Navigator
                screenOptions={{
                  headerShown: false,
                }}
              >
                <Stack.Screen name="Home" component={HomeScreen} />
                <Stack.Screen name="Styling" component={StylingScreen} />
                <Stack.Screen name="Output" component={OutputScreen} />
              </Stack.Navigator>
            </NavigationContainer>
          </WebViewProvider>
        </ThemeProvider>
      </SafeAreaProvider>
    </ErrorBoundary>
  );
}

export default App;

