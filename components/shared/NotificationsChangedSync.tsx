'use client';

// ========================================
// KEEP THE COUNTS ON THE PAGE IN STEP WITH THE NOTIFICATION LIST
// ========================================
// The number beside "Notifications" in the member menu (and in the admin sidebar
// and phone bar) is rendered by the SERVER, from unreadNotificationCount().
// That is the right place for it - but it means the number only changes when the
// page is rendered again.
//
// NotificationCentre sends this window event after every read or delete. This
// small component listens for it and asks the router for a fresh render, so the
// server re-counts and the badge drops from 5 to 4 to 3 without the member
// touching the refresh button.
//
// It renders nothing at all.
// ========================================

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';

export function NotificationsChangedSync() {
  const router = useRouter();

  useEffect(() => {
    const onChange = () => router.refresh();

    window.addEventListener('notifications:changed', onChange);
    return () => window.removeEventListener('notifications:changed', onChange);
  }, [router]);

  return null;
}
