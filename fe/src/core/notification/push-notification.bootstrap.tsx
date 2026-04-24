import { useEffect } from "react";
import { syncCurrentPushSubscription, supportsPushNotifications } from "./push-notification.manager";
import { useAuthStore } from "@root/store/auth-store";

export function PushNotificationBootstrap() {
  const isLoggedIn = useAuthStore((state) => state.isLoggedIn);

  useEffect(() => {
    if (!isLoggedIn || !supportsPushNotifications()) {
      return;
    }

    void syncCurrentPushSubscription().catch(() => undefined);
  }, [isLoggedIn]);

  return null;
}
