"use client";
import React from "react";
import Image from "next/image";
import styles from "./MarketNews.module.css";
import type { NewsItem } from "../../app/dashboard/types";

export type MarketNewsProps = {
  items: NewsItem[];
  limit?: number;
};

export function MarketNews({ items, limit = 5 }: MarketNewsProps) {
  const displayItems = items.slice(0, limit);

  const handleNewsClick = (url?: string) => {
    if (url) {
      window.open(url, "_blank", "noopener,noreferrer");
    }
  };

  return (
    <div className={styles.newsList}>
      {displayItems.map((news, idx) => (
        <article
          key={`${news.headline}-${idx}`}
          className={styles.newsCard}
          onClick={() => handleNewsClick(news.url)}
          role={news.url ? "button" : "article"}
          tabIndex={news.url ? 0 : undefined}
        >
          {news.imageUrl && (
            <div className={styles.newsImage}>
              <Image
                src={news.imageUrl}
                alt={news.headline}
                width={80}
                height={80}
                style={{ objectFit: "cover" }}
              />
            </div>
          )}
          <div className={styles.newsContent}>
            <h3 className={styles.newsHeadline}>{news.headline}</h3>
            <div className={styles.newsFooter}>
              <span className={styles.newsSource}>{news.source}</span>
              {news.timestamp && (
                <span className={styles.newsTime}>{news.timestamp}</span>
              )}
            </div>
          </div>
        </article>
      ))}
    </div>
  );
}
