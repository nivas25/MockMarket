"use client";
import "./page.css";
import { useEffect } from "react";

export default function Display_Block() {
    useEffect(() => {
        const token = sessionStorage.getItem("accessToken")
        if (!token) {
            window.location.href = '/unauthorized_access'
            return
        }

    }, [])

    return (
        <div className="block-container">
            <div className="block-card">
                <img
                    src="https://cdn-icons-png.flaticon.com/512/3064/3064197.png"
                    alt="Account Blocked"
                    className="block-icon"
                />
                <h1 className="block-title">Account Blocked</h1>
                <p className="block-message">
                    Your account has been <span className="highlight">blocked</span> by the admin.
                </p>

                <a href="/" className="block-btn">Go to Home</a>
            </div>
        </div>
    );
}
