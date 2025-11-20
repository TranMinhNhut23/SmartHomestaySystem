import React, { createContext, useContext, useState, ReactNode } from 'react';
import { apiService } from '@/services/api';

interface BookingData {
  homestayId: string;
  roomId: string;
  checkIn: string;
  checkOut: string;
  numberOfGuests: number;
  guestInfo?: {
    fullName?: string;
    phone?: string;
    email?: string;
    specialRequests?: string;
  };
}

interface BookingContextType {
  createBooking: (bookingData: BookingData) => Promise<any>;
  getGuestBookings: (params?: { status?: string; page?: number; limit?: number }) => Promise<any>;
  getHostBookings: (params?: { status?: string; homestayId?: string; page?: number; limit?: number }) => Promise<any>;
  getBookingById: (id: string) => Promise<any>;
  updateBookingStatus: (id: string, status: string) => Promise<any>;
  checkRoomAvailability: (roomId: string, checkIn: string, checkOut: string) => Promise<any>;
}

const BookingContext = createContext<BookingContextType | undefined>(undefined);

export function BookingProvider({ children }: { children: ReactNode }) {
  const createBooking = async (bookingData: BookingData) => {
    return await apiService.createBooking(bookingData);
  };

  const getGuestBookings = async (params?: { status?: string; page?: number; limit?: number }) => {
    return await apiService.getGuestBookings(params);
  };

  const getHostBookings = async (params?: { status?: string; homestayId?: string; page?: number; limit?: number }) => {
    return await apiService.getHostBookings(params);
  };

  const getBookingById = async (id: string) => {
    return await apiService.getBookingById(id);
  };

  const updateBookingStatus = async (id: string, status: string) => {
    return await apiService.updateBookingStatus(id, status);
  };

  const checkRoomAvailability = async (roomId: string, checkIn: string, checkOut: string) => {
    return await apiService.checkRoomAvailability(roomId, checkIn, checkOut);
  };

  return (
    <BookingContext.Provider
      value={{
        createBooking,
        getGuestBookings,
        getHostBookings,
        getBookingById,
        updateBookingStatus,
        checkRoomAvailability,
      }}
    >
      {children}
    </BookingContext.Provider>
  );
}

export function useBooking() {
  const context = useContext(BookingContext);
  if (context === undefined) {
    throw new Error('useBooking must be used within a BookingProvider');
  }
  return context;
}









