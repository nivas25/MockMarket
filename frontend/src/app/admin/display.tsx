"use client";

import React, { useEffect, useMemo, useState } from "react";
import axios from "axios";
import styles from "./Display_Admin.module.css";
import { url } from "../../config";
import { AdminTopBar } from "../../components/admin/AdminTopBar";
import LoadingScreen from "../../components/common/LoadingScreen";

interface User {
  user_id: number;
  name: string;
  email_id: string;
  balance: string;
  created_at: string;
  access?: string;
}

interface UsersResponse {
  users: User[];
}

export default function Display_Admin() {
  const [users, setUsers] = useState<User[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [updatingUsers, setUpdatingUsers] = useState<Set<number>>(new Set());
  const [theme, setTheme] = useState("light");
  const [isScrolled, setIsScrolled] = useState(false);
  // UI/Filters
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState<
    "all" | "blocked" | "unblocked"
  >("all");
  const [sortBy, setSortBy] = useState<"created" | "name" | "balance">(
    "created"
  );
  const [sortDir, setSortDir] = useState<"asc" | "desc">("desc");
  const [selected, setSelected] = useState<Set<number>>(new Set());
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(12);

  // Theme management
  useEffect(() => {
    const savedTheme = localStorage.getItem("theme") || "light";
    setTheme(savedTheme);
    document.body.className = savedTheme;
  }, []);

  const handleToggleTheme = () => {
    const newTheme = theme === "light" ? "dark" : "light";
    setTheme(newTheme);
    localStorage.setItem("theme", newTheme);
    document.body.className = newTheme;
  };

  // Scroll detection
  useEffect(() => {
    const handleScroll = () => {
      setIsScrolled(window.scrollY > 10);
    };
    window.addEventListener("scroll", handleScroll);
    return () => window.removeEventListener("scroll", handleScroll);
  }, []);

  // 🔹 Fetch all users
  const fetchUsers = async () => {
    try {
      setLoading(true);
      const response = await axios.get<UsersResponse>(
        `${url}/admin/fetch_user`
      );
      setUsers(response.data.users);
      setError(null);
    } catch (err) {
      setError("Failed to fetch users");
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  // 🔹 Handle both Block & Unblock
  const handleAccessChange = async (
    userId: number,
    newStatus: "blocked" | "unblocked"
  ) => {
    setUpdatingUsers((prev) => new Set([...prev, userId]));
    try {
      await axios.put(`${url}/user/update_access/${userId}`, {
        access: newStatus,
      });

      setUsers(
        users.map((user) =>
          user.user_id === userId ? { ...user, access: newStatus } : user
        )
      );
      alert(
        `User ${newStatus === "blocked" ? "blocked" : "unblocked"} successfully`
      );
    } catch (err) {
      console.error(`Failed to ${newStatus} user:`, err);
      alert(`Failed to ${newStatus} user`);
    } finally {
      setUpdatingUsers((prev) => {
        const newSet = new Set(prev);
        newSet.delete(userId);
        return newSet;
      });
    }
  };

  useEffect(() => {
    fetchUsers();
  }, []);

  // Derived collections and stats
  const filteredSorted = useMemo(() => {
    const term = search.trim().toLowerCase();
    const list = users.filter((u) => {
      const matchesSearch =
        !term ||
        u.name.toLowerCase().includes(term) ||
        u.email_id.toLowerCase().includes(term) ||
        String(u.user_id).includes(term);
      const matchesStatus =
        statusFilter === "all"
          ? true
          : (u.access || "unblocked") === statusFilter;
      return matchesSearch && matchesStatus;
    });

    list.sort((a, b) => {
      let cmp = 0;
      if (sortBy === "name") {
        cmp = a.name.localeCompare(b.name);
      } else if (sortBy === "balance") {
        const av = parseFloat(a.balance || "0");
        const bv = parseFloat(b.balance || "0");
        cmp = av - bv;
      } else {
        // created
        cmp =
          new Date(a.created_at).getTime() - new Date(b.created_at).getTime();
      }
      return sortDir === "asc" ? cmp : -cmp;
    });

    return list;
  }, [users, search, statusFilter, sortBy, sortDir]);

  const totalUsers = filteredSorted.length;
  const blockedCount = useMemo(
    () => filteredSorted.filter((u) => u.access === "blocked").length,
    [filteredSorted]
  );
  const activeCount = totalUsers - blockedCount;
  const totalBalance = useMemo(
    () =>
      filteredSorted.reduce(
        (sum, u) => sum + (parseFloat(u.balance || "0") || 0),
        0
      ),
    [filteredSorted]
  );

  // Pagination
  const totalPages = Math.max(1, Math.ceil(totalUsers / pageSize));
  const currentPage = Math.min(page, totalPages);
  const startIndex = (currentPage - 1) * pageSize;
  const paginated = filteredSorted.slice(startIndex, startIndex + pageSize);

  // Selection handlers
  const toggleSelect = (id: number) => {
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const pageIds = paginated.map((u) => u.user_id);
  const allSelectedOnPage = pageIds.every((id) => selected.has(id));
  const toggleSelectAllOnPage = () => {
    setSelected((prev) => {
      const next = new Set(prev);
      if (allSelectedOnPage) {
        pageIds.forEach((id) => next.delete(id));
      } else {
        pageIds.forEach((id) => next.add(id));
      }
      return next;
    });
  };

  // Bulk actions
  const bulkChangeAccess = async (newStatus: "blocked" | "unblocked") => {
    const ids = Array.from(selected);
    for (const id of ids) {
      await handleAccessChange(id, newStatus);
    }
    setSelected(new Set());
    alert(
      `${newStatus === "blocked" ? "Blocked" : "Unblocked"} ${
        ids.length
      } user(s)`
    );
  };

  // Export CSV of current filtered list
  const exportCsv = () => {
    const headers = [
      "user_id",
      "name",
      "email_id",
      "balance",
      "created_at",
      "access",
    ];
    const source = filteredSorted;
    const rows = source.map((u) => [
      u.user_id,
      `"${(u.name || "").replace(/"/g, '""')}"`,
      `"${(u.email_id || "").replace(/"/g, '""')}"`,
      parseFloat(u.balance || "0"),
      new Date(u.created_at).toISOString(),
      u.access || "unblocked",
    ]);
    const csv = [headers.join(","), ...rows.map((r) => r.join(","))].join("\n");
    const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
    const urlObj = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = urlObj;
    a.download = `users_export_${Date.now()}.csv`;
    a.click();
    URL.revokeObjectURL(urlObj);
  };

  if (loading) {
    return (
      <>
        <AdminTopBar
          theme={theme}
          isScrolled={isScrolled}
          onToggleTheme={handleToggleTheme}
        />
        <LoadingScreen message="Loading users" />
      </>
    );
  }

  if (error) {
    return (
      <>
        <AdminTopBar
          theme={theme}
          isScrolled={isScrolled}
          onToggleTheme={handleToggleTheme}
        />
        <div className={styles.container}>
          <div className={styles.error}>{error}</div>
        </div>
      </>
    );
  }

  return (
    <>
      <AdminTopBar
        theme={theme}
        isScrolled={isScrolled}
        onToggleTheme={handleToggleTheme}
      />
      <div className={styles.container}>
        <div className={styles.contentWrapper}>
          <h1 className={styles.pageTitle}>User Management</h1>
          <p className={styles.pageSubtitle}>
            Manage user access and monitor account status
          </p>

          {/* Stats */}
          <div className={styles.statsGrid}>
            <div className={styles.statCard}>
              <div className={styles.statLabel}>Total Users</div>
              <div className={styles.statValue}>
                {totalUsers.toLocaleString("en-IN")}
              </div>
            </div>
            <div className={styles.statCard}>
              <div className={styles.statLabel}>Active</div>
              <div className={styles.statValue}>
                {activeCount.toLocaleString("en-IN")}
              </div>
            </div>
            <div className={styles.statCard}>
              <div className={styles.statLabel}>Blocked</div>
              <div className={styles.statValue}>
                {blockedCount.toLocaleString("en-IN")}
              </div>
            </div>
            <div className={styles.statCard}>
              <div className={styles.statLabel}>Total Balance</div>
              <div className={styles.statValue}>
                ₹{totalBalance.toLocaleString("en-IN")}
              </div>
            </div>
          </div>

          {/* Toolbar */}
          <div className={styles.toolbar}>
            <div className={styles.controlsRow}>
              <div className={styles.searchBox}>
                <input
                  value={search}
                  onChange={(e) => {
                    setSearch(e.target.value);
                    setPage(1);
                  }}
                  placeholder="Search name, email, or ID"
                  aria-label="Search users"
                />
              </div>
              <div className={styles.filterGroup}>
                <label>Status</label>
                <select
                  value={statusFilter}
                  onChange={(e) => {
                    setStatusFilter(
                      e.target.value as "all" | "blocked" | "unblocked"
                    );
                    setPage(1);
                  }}
                  aria-label="Filter by status"
                >
                  <option value="all">All</option>
                  <option value="unblocked">Active</option>
                  <option value="blocked">Blocked</option>
                </select>
              </div>

              <div className={styles.sortGroup}>
                <label>Sort</label>
                <select
                  value={`${sortBy}:${sortDir}`}
                  onChange={(e) => {
                    const [sb, sd] = e.target.value.split(":");
                    setSortBy(sb as "created" | "name" | "balance");
                    setSortDir(sd as "asc" | "desc");
                    setPage(1);
                  }}
                  aria-label="Sort users"
                >
                  <option value="created:desc">Newest</option>
                  <option value="created:asc">Oldest</option>
                  <option value="name:asc">Name A→Z</option>
                  <option value="name:desc">Name Z→A</option>
                  <option value="balance:desc">Balance High→Low</option>
                  <option value="balance:asc">Balance Low→High</option>
                </select>
              </div>
              <div className={styles.pageSize}>
                <label>Page Size</label>
                <select
                  value={pageSize}
                  onChange={(e) => {
                    setPageSize(parseInt(e.target.value, 10));
                    setPage(1);
                  }}
                  aria-label="Page size"
                >
                  <option value={6}>6</option>
                  <option value={12}>12</option>
                  <option value={24}>24</option>
                  <option value={48}>48</option>
                </select>
              </div>
              <div className={styles.exportWrap}>
                <button
                  className={`${styles.btn} ${styles.btnExport}`}
                  onClick={exportCsv}
                >
                  Export CSV
                </button>
              </div>
            </div>

            <div className={styles.bulkRow}>
              <label className={styles.selectAll}>
                <input
                  type="checkbox"
                  checked={allSelectedOnPage}
                  onChange={toggleSelectAllOnPage}
                />
                <span>Select page</span>
              </label>
              <div className={styles.bulkActions}>
                <span className={styles.selectedCount}>
                  {selected.size} selected
                </span>
                <button
                  className={`${styles.btn} ${styles.btnUnblock}`}
                  disabled={selected.size === 0}
                  onClick={() => bulkChangeAccess("unblocked")}
                >
                  Unblock
                </button>
                <button
                  className={`${styles.btn} ${styles.btnBlock}`}
                  disabled={selected.size === 0}
                  onClick={() => bulkChangeAccess("blocked")}
                >
                  Block
                </button>
              </div>
            </div>
          </div>

          <div className={styles.usersGrid}>
            {paginated.map((user) => {
              const isBlocked = user.access === "blocked";
              const isUpdating = updatingUsers.has(user.user_id);
              const initials = (user.name || "?")
                .split(" ")
                .map((s) => s.charAt(0))
                .join("")
                .slice(0, 2)
                .toUpperCase();
              return (
                <div
                  key={user.user_id}
                  className={`${styles.userCard} ${
                    isBlocked ? styles.blocked : ""
                  }`}
                >
                  <div className={styles.userHeader}>
                    <label className={styles.selectBox}>
                      <input
                        type="checkbox"
                        checked={selected.has(user.user_id)}
                        onChange={() => toggleSelect(user.user_id)}
                        disabled={isUpdating}
                      />
                    </label>
                    <div className={styles.userHeaderLeft}>
                      <div className={styles.avatar} aria-hidden>
                        {initials}
                      </div>
                      <h2 className={styles.userName}>{user.name}</h2>
                    </div>
                    {isBlocked && (
                      <span className={styles.blockedBadge}>Blocked</span>
                    )}
                  </div>

                  <div className={styles.userInfo}>
                    <div className={styles.infoRow}>
                      <span className={styles.infoLabel}>Email:</span>
                      <span className={styles.infoValue}>{user.email_id}</span>
                    </div>

                    <div className={styles.infoRow}>
                      <span className={styles.infoLabel}>Balance:</span>
                      <span className={`${styles.infoValue} ${styles.balance}`}>
                        ₹{parseFloat(user.balance).toLocaleString("en-IN")}
                      </span>
                    </div>

                    <div className={styles.infoRow}>
                      <span className={styles.infoLabel}>User ID:</span>
                      <span className={styles.infoValue}>{user.user_id}</span>
                    </div>

                    <div className={styles.infoRow}>
                      <span className={styles.infoLabel}>Created:</span>
                      <span className={styles.infoValue}>
                        {new Date(user.created_at).toLocaleDateString("en-IN")}
                      </span>
                    </div>
                  </div>

                  <div className={styles.userActions}>
                    {isBlocked ? (
                      <button
                        className={`${styles.btn} ${styles.btnUnblock}`}
                        onClick={() =>
                          handleAccessChange(user.user_id, "unblocked")
                        }
                        disabled={isUpdating}
                      >
                        {isUpdating ? "Please wait..." : "Unblock User"}
                      </button>
                    ) : (
                      <button
                        className={`${styles.btn} ${styles.btnBlock}`}
                        onClick={() =>
                          handleAccessChange(user.user_id, "blocked")
                        }
                        disabled={isUpdating}
                      >
                        {isUpdating ? "Please wait..." : "Block User"}
                      </button>
                    )}
                  </div>
                </div>
              );
            })}
          </div>

          {users.length === 0 && (
            <div className={styles.noUsers}>No users found</div>
          )}

          {/* Pagination */}
          {totalPages > 1 && (
            <div className={styles.pagination}>
              <button
                className={styles.pageBtn}
                onClick={() => setPage((p) => Math.max(1, p - 1))}
                disabled={currentPage === 1}
              >
                Prev
              </button>
              <div className={styles.pageInfo}>
                Page {currentPage} of {totalPages}
              </div>
              <button
                className={styles.pageBtn}
                onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
                disabled={currentPage === totalPages}
              >
                Next
              </button>
            </div>
          )}
        </div>
      </div>
    </>
  );
}
