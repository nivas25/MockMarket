"use client";

import { useEffect, useState } from "react";
import axios from "axios";
import DashboardClient from "./DashboardClient";
import type { DashboardPageProps } from "./types";
import { url } from "../../config"
export const metadata = {
    title: "Dashboard | MockMarket",
    description: "Track indices, holdings, orders, and your watchlist.",
};

export default function CheckvalidUser(props: DashboardPageProps = {}) {
    const [isVerified, setIsVerified] = useState<boolean | null>(null);

    useEffect(() => {
        const verifyUser = async () => {
            try {
                const token = localStorage.getItem("authToken");
                if (!token) {
                    console.warn("No token found. Redirecting to login...");
                    window.location.href = "/unauthorized_access";
                    return;
                }

                const res = await axios.get(`${url}/user/verify`, {
                    headers: {
                        Authorization: `Bearer ${token}`,
                    },
                });

                if (res.data.valid) {
                    setIsVerified(true);
                } else {
                    throw new Error("Invalid user");
                }
            } catch (err) {
                console.error("User verification failed:", err);
                setIsVerified(false);
                window.location.href = "/";
            }
        };

        verifyUser();
    }, []);

    if (isVerified === null) {
        return <div>Checking authentication...</div>;
    }

    if (!isVerified) {
        return <div>Unauthorized</div>;
    }

    return <DashboardClient {...props} />;
}
