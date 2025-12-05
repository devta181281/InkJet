import { Linking, Platform, Alert } from 'react-native';

/**
 * Opens the app's settings page so users can enable permissions.
 * Used when permissions are permanently denied.
 */
export const openAppSettings = (): void => {
    if (Platform.OS === 'ios') {
        Linking.openURL('app-settings:');
    } else {
        Linking.openSettings();
    }
};

/**
 * Shows an alert for permanently denied permissions with option to open settings.
 */
export const showPermissionDeniedAlert = (permissionName: string): void => {
    Alert.alert(
        'Permission Required',
        `${permissionName} permission was denied. Please enable it in Settings to use this feature.`,
        [
            { text: 'Cancel', style: 'cancel' },
            { text: 'Open Settings', onPress: openAppSettings }
        ]
    );
};
