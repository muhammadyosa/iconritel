import { useState, useEffect } from "react";

/**
 * Hook that provides realtime current date that updates at midnight
 * Returns date in YYYY-MM-DD format
 */
export function useRealtimeDate() {
  const getTodayString = () => new Date().toISOString().split("T")[0];
  
  const [today, setToday] = useState(getTodayString);

  useEffect(() => {
    // Calculate time until next midnight
    const now = new Date();
    const tomorrow = new Date(now);
    tomorrow.setDate(tomorrow.getDate() + 1);
    tomorrow.setHours(0, 0, 0, 0);
    const msUntilMidnight = tomorrow.getTime() - now.getTime();

    // Set timeout for midnight update
    const midnightTimeout = setTimeout(() => {
      setToday(getTodayString());
      
      // Then set interval for daily updates
      const dailyInterval = setInterval(() => {
        setToday(getTodayString());
      }, 24 * 60 * 60 * 1000);

      return () => clearInterval(dailyInterval);
    }, msUntilMidnight);

    // Also check every minute in case the device was sleeping
    const checkInterval = setInterval(() => {
      const currentDate = getTodayString();
      if (currentDate !== today) {
        setToday(currentDate);
      }
    }, 60 * 1000);

    return () => {
      clearTimeout(midnightTimeout);
      clearInterval(checkInterval);
    };
  }, [today]);

  return today;
}
