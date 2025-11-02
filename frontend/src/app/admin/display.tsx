"use client"

import React, { useEffect, useState } from 'react'
import axios from 'axios'
import './Display_Admin.css'
import { url } from '../../config'

interface User {
    user_id: number
    name: string
    email_id: string
    balance: string
    created_at: string
    access?: string
}

interface UsersResponse {
    users: User[]
}

export default function Display_Admin() {
    const [users, setUsers] = useState<User[]>([])
    const [loading, setLoading] = useState(true)
    const [error, setError] = useState<string | null>(null)
    const [updatingUsers, setUpdatingUsers] = useState<Set<number>>(new Set())

    // 🔹 Fetch all users
    const fetchUsers = async () => {
        try {
            setLoading(true)
            const response = await axios.get<UsersResponse>(`${url}/admin/fetch_user`)
            setUsers(response.data.users)
            setError(null)
        } catch (err) {
            setError('Failed to fetch users')
            console.error(err)
        } finally {
            setLoading(false)
        }
    }

    // 🔹 Handle both Block & Unblock
    const handleAccessChange = async (userId: number, newStatus: "blocked" | "unblocked") => {
        setUpdatingUsers(prev => new Set([...prev, userId]))
        try {
            await axios.put(`${url}/user/update_access/${userId}`, { access: newStatus })

            setUsers(users.map(user =>
                user.user_id === userId ? { ...user, access: newStatus } : user
            ))

            alert(`User ${newStatus === "blocked" ? "blocked" : "unblocked"} successfully!`)
        } catch (err) {
            console.error(`Failed to ${newStatus} user:`, err)
            alert(`Failed to ${newStatus} user`)
        } finally {
            setUpdatingUsers(prev => {
                const newSet = new Set(prev)
                newSet.delete(userId)
                return newSet
            })
        }
    }

    useEffect(() => {
        fetchUsers()
    }, [])

    if (loading) return <div className="loading">Loading users...</div>
    if (error) return <div className="error">{error}</div>

    return (
        <div className="admin-container">
            <h1 className="admin-title">User Management</h1>

            <div className="users-grid">
                {users.map((user) => {
                    const isBlocked = user.access === "blocked"
                    const isUpdating = updatingUsers.has(user.user_id)
                    return (
                        <div key={user.user_id} className={`user-card ${isBlocked ? 'blocked' : ''}`}>
                            <div className="user-header">
                                <h2 className="user-name">{user.name}</h2>
                                {isBlocked && <span className="blocked-badge">Blocked</span>}
                            </div>

                            <div className="user-info">
                                <div className="info-row">
                                    <span className="info-label">Email:</span>
                                    <span className="info-value">{user.email_id}</span>
                                </div>

                                <div className="info-row">
                                    <span className="info-label">Balance:</span>
                                    <span className="info-value balance">₹{parseFloat(user.balance).toLocaleString('en-IN')}</span>
                                </div>

                                <div className="info-row">
                                    <span className="info-label">User ID:</span>
                                    <span className="info-value">{user.user_id}</span>
                                </div>

                                <div className="info-row">
                                    <span className="info-label">Created:</span>
                                    <span className="info-value">{new Date(user.created_at).toLocaleDateString('en-IN')}</span>
                                </div>
                            </div>

                            <div className="user-actions">
                                {isBlocked ? (
                                    <button
                                        className="btn btn-unblock"
                                        onClick={() => handleAccessChange(user.user_id, "unblocked")}
                                        disabled={isUpdating}
                                    >
                                        {isUpdating ? "Please wait..." : "Unblock User"}
                                    </button>
                                ) : (
                                    <button
                                        className="btn btn-block"
                                        onClick={() => handleAccessChange(user.user_id, "blocked")}
                                        disabled={isUpdating}
                                    >
                                        {isUpdating ? "Please wait..." : "Block User"}
                                    </button>
                                )}
                            </div>
                        </div>
                    )
                })}
            </div>

            {users.length === 0 && (
                <div className="no-users">No users found</div>
            )}
        </div>
    )
}