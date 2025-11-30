import { DarkTheme, DefaultTheme, ThemeProvider } from '@react-navigation/native';
import { Stack } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import 'react-native-reanimated';

import { useColorScheme } from '@/hooks/use-color-scheme';
import { AuthProvider } from '@/contexts/AuthContext';
import { HomestayFormProvider } from '@/contexts/HomestayFormContext';
import { BookingProvider } from '@/contexts/BookingContext';
import { WalletProvider } from '@/contexts/WalletContext';
import { ChatProvider } from '@/contexts/ChatContext';
import { NotificationProvider } from '@/contexts/NotificationContext';
import { ChatUnreadProvider } from '@/contexts/ChatUnreadContext';

export const unstable_settings = {
  anchor: '(tabs)',
};

export default function RootLayout() {
  const colorScheme = useColorScheme();

  return (
    <AuthProvider>
      <NotificationProvider>
        <ChatUnreadProvider>
          <ChatProvider>
            <WalletProvider>
              <HomestayFormProvider>
                <BookingProvider>
                <ThemeProvider value={colorScheme === 'dark' ? DarkTheme : DefaultTheme}>
          <Stack>
            <Stack.Screen name="(tabs)" options={{ headerShown: false }} />
            <Stack.Screen 
              name="login" 
              options={{ 
                presentation: 'modal',
                headerShown: false 
              }} 
            />
            <Stack.Screen 
              name="promotions" 
              options={{ 
                presentation: 'modal',
                headerShown: false 
              }} 
            />
            <Stack.Screen 
              name="register" 
              options={{ 
                presentation: 'modal',
                headerShown: false 
              }} 
            />
            <Stack.Screen 
              name="add-homestay" 
              options={{ 
                presentation: 'modal',
                headerShown: false 
              }} 
            />
            <Stack.Screen 
              name="add-homestay-rooms" 
              options={{ 
                presentation: 'modal',
                headerShown: false 
              }} 
            />
            <Stack.Screen 
              name="add-homestay-room-names" 
              options={{ 
                presentation: 'modal',
                headerShown: false 
              }} 
            />
            <Stack.Screen 
              name="add-homestay-amenities" 
              options={{ 
                presentation: 'modal',
                headerShown: false 
              }} 
            />
            <Stack.Screen 
              name="my-homestays" 
              options={{ 
                presentation: 'modal',
                headerShown: false 
              }} 
            />
            <Stack.Screen 
              name="homestay-detail" 
              options={{ 
                presentation: 'modal',
                headerShown: false 
              }} 
            />
            <Stack.Screen 
              name="edit-homestay" 
              options={{ 
                presentation: 'modal',
                headerShown: false 
              }} 
            />
            <Stack.Screen 
              name="booking" 
              options={{ 
                presentation: 'modal',
                headerShown: false 
              }} 
            />
            <Stack.Screen 
              name="booking-confirm" 
              options={{ 
                presentation: 'modal',
                headerShown: false 
              }} 
            />
            <Stack.Screen 
              name="host-bookings" 
              options={{ 
                presentation: 'modal',
                headerShown: false 
              }} 
            />
            <Stack.Screen 
              name="host-stats" 
              options={{ 
                presentation: 'modal',
                headerShown: false 
              }} 
            />
            <Stack.Screen 
              name="my-bookings" 
              options={{ 
                presentation: 'modal',
                headerShown: false 
              }} 
            />
            <Stack.Screen 
              name="admin-pending-homestays" 
              options={{ 
                presentation: 'modal',
                headerShown: false,
                title: ''
              }} 
            />
            <Stack.Screen 
              name="admin-users" 
              options={{ 
                presentation: 'modal',
                headerShown: false,
                title: ''
              }} 
            />
            <Stack.Screen 
              name="admin-host-requests" 
              options={{ 
                presentation: 'modal',
                headerShown: false,
                title: ''
              }} 
            />
            <Stack.Screen 
              name="admin-statistics" 
              options={{ 
                presentation: 'modal',
                headerShown: false,
                title: ''
              }} 
            />
            <Stack.Screen 
              name="host-request-form" 
              options={{ 
                presentation: 'modal',
                headerShown: false 
              }} 
            />
            <Stack.Screen 
              name="host-request-terms" 
              options={{ 
                presentation: 'modal',
                headerShown: false 
              }} 
            />
            <Stack.Screen 
              name="wallet" 
              options={{ 
                presentation: 'modal',
                headerShown: false 
              }} 
            />
            <Stack.Screen 
              name="wallet-deposit" 
              options={{ 
                presentation: 'modal',
                headerShown: false 
              }} 
            />
            <Stack.Screen 
              name="wallet-transactions" 
              options={{ 
                presentation: 'modal',
                headerShown: false 
              }} 
            />
            <Stack.Screen 
              name="wallet-withdraw" 
              options={{ 
                presentation: 'modal',
                headerShown: false 
              }} 
            />
            <Stack.Screen 
              name="wallet-deposit-result" 
              options={{ 
                presentation: 'modal',
                headerShown: false 
              }} 
            />
            <Stack.Screen 
              name="edit-profile" 
              options={{ 
                presentation: 'modal',
                headerShown: false 
              }} 
            />
            <Stack.Screen name="modal" options={{ presentation: 'modal', title: 'Modal' }} />
          </Stack>
            <StatusBar style="auto" />
          </ThemeProvider>
                </BookingProvider>
              </HomestayFormProvider>
            </WalletProvider>
          </ChatProvider>
        </ChatUnreadProvider>
      </NotificationProvider>
    </AuthProvider>
  );
}