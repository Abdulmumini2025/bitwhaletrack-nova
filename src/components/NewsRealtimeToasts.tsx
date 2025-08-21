import { useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "@/components/ui/sonner";

export const NewsRealtimeToasts = () => {
  useEffect(() => {
    const channel = supabase
      .channel("news-inserts")
      .on(
        "postgres_changes",
        { event: "INSERT", schema: "public", table: "news", filter: "status=eq.approved" },
        (payload) => {
          const news = payload.new as any;
          const title: string = news?.title || "New post";
          const category: string = String(news?.category || "").replace(/_/g, " ");
          toast(title, {
            description: `${category ? category + " • " : ""}A new post was published`,
            action: {
              label: "View",
              onClick: () => {
                // Navigate to home to see the latest posts
                window.location.assign("/");
              },
            },
          });
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, []);

  return null;
};