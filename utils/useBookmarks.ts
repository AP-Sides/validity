import { useState, useEffect, useCallback } from "react";
import AsyncStorage from "@react-native-async-storage/async-storage";

const KEY = "validity_bookmarks";

export interface Bookmark {
  id: string;
  type: "fact" | "myth";
  savedAt: string;
  // For facts:
  headline?: string;
  body?: string;
  tag?: "Overturned" | "Surprising" | "Confirmed";
  journal?: string;
  year?: number;
  url?: string;
  // For myths:
  claim?: string;
  verdict?: "BUSTED" | "CONFIRMED" | "COMPLICATED";
  one_liner?: string;
  explanation?: string;
}

export function useBookmarks() {
  const [bookmarks, setBookmarks] = useState<Bookmark[]>([]);

  useEffect(() => {
    AsyncStorage.getItem(KEY).then((raw) => {
      if (raw) setBookmarks(JSON.parse(raw));
    });
  }, []);

  const save = useCallback(async (updated: Bookmark[]) => {
    setBookmarks(updated);
    await AsyncStorage.setItem(KEY, JSON.stringify(updated));
  }, []);

  const toggle = useCallback(
    async (item: Bookmark) => {
      const current = await AsyncStorage.getItem(KEY);
      const list: Bookmark[] = current ? JSON.parse(current) : [];
      const exists = list.findIndex((b) => b.id === item.id);
      const updated =
        exists >= 0 ? list.filter((b) => b.id !== item.id) : [item, ...list];
      console.log(
        "[Bookmarks] Toggle bookmark:",
        item.id,
        exists >= 0 ? "removed" : "added"
      );
      await save(updated);
    },
    [save]
  );

  const isBookmarked = useCallback(
    (id: string) => bookmarks.some((b) => b.id === id),
    [bookmarks]
  );

  return { bookmarks, toggle, isBookmarked };
}
