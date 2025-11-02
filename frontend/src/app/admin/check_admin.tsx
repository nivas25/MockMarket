"use client";
import { useEffect, useState } from "react";
import { jwtDecode } from "jwt-decode";
import Display_Admin from "./display"

export default function AdminPage() {
    const [isAdmin, setIsAdmin] = useState(false);

    useEffect(() => {
        const token = localStorage.getItem("authToken");
        if (!token) {
            window.location.href = "/unauthorized_access";
            return;
        }
        const decode = jwtDecode(token);
        if (decode?.role === "admin" || decode?.sub?.role === "admin") {
            setIsAdmin(true);
        } else {
            window.location.href = "/unauthorized_access";
        }
    }, []);

    if (!isAdmin) return <p>Verifying admin access...</p>;

    return (
        <Display_Admin />
    );
}
