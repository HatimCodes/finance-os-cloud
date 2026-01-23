import React, { createContext, useContext, useEffect, useMemo, useState } from "react";
import { useAuth } from "./authStore.jsx";

const CategoriesCtx = createContext(null);

export function CategoriesProvider({ children }) {
  const { auth, api: authApi } = useAuth();
  const online = auth.mode === "online" && Boolean(auth.token);

  const [categories, setCategories] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  async function fetchCategories() {
    if (!online) {
      setCategories([]);
      return;
    }
    setLoading(true);
    setError(null);
    try {
      const out = await authApi.request("/categories/list.php");
      setCategories(Array.isArray(out.categories) ? out.categories : []);
    } catch (e) {
      setError(e?.message || "Failed to load categories");
    } finally {
      setLoading(false);
    }
  }

  async function createCategory({ name, kind = "expense" }) {
    const out = await authApi.request("/categories/create.php", {
      method: "POST",
      body: { name, kind },
    });
    await fetchCategories();
    return out.category;
  }

  async function updateCategory({ id, name, sort_order, kind }) {
    const body = { id };
    if (name !== undefined) body.name = name;
    if (sort_order !== undefined) body.sort_order = sort_order;
    if (kind !== undefined) body.kind = kind;
    const out = await authApi.request("/categories/update.php", {
      method: "POST",
      body,
    });
    await fetchCategories();
    return out.category;
  }

  async function deleteCategory({ id }) {
    const out = await authApi.request("/categories/delete.php", {
      method: "POST",
      body: { id },
    });
    await fetchCategories();
    return out;
  }

  // Fetch once on login
  useEffect(() => {
    if (online) fetchCategories();
    else {
      setCategories([]);
      setError(null);
      setLoading(false);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [online]);

  const helpers = useMemo(() => {
    const map = new Map();
    for (const c of categories) map.set(Number(c.id), c);
    function nameOf(id) {
      const c = map.get(Number(id));
      return c?.name || "Other";
    }
    function expenseCategories() {
      return categories.filter((c) => (c.kind || "expense") === "expense");
    }
    return { map, nameOf, expenseCategories };
  }, [categories]);

  return (
    <CategoriesCtx.Provider
      value={{
        categories,
        loading,
        error,
        fetchCategories,
        createCategory,
        updateCategory,
        deleteCategory,
        ...helpers,
      }}
    >
      {children}
    </CategoriesCtx.Provider>
  );
}

export function useCategories() {
  const ctx = useContext(CategoriesCtx);
  if (!ctx) throw new Error("useCategories must be used inside CategoriesProvider");
  return ctx;
}
