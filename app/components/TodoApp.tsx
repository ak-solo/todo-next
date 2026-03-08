"use client";

import { useState, useEffect, useRef } from "react";

type Filter = "all" | "active" | "completed";

interface Todo {
  id: number;
  text: string;
  completed: boolean;
}

export default function TodoApp() {
  const [todos, setTodos] = useState<Todo[]>([]);
  const [input, setInput] = useState("");
  const [filter, setFilter] = useState<Filter>("all");
  const [editingId, setEditingId] = useState<number | null>(null);
  const [editingText, setEditingText] = useState("");
  const editInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    const stored = localStorage.getItem("todos");
    if (stored) setTodos(JSON.parse(stored));
  }, []);

  useEffect(() => {
    localStorage.setItem("todos", JSON.stringify(todos));
  }, [todos]);

  const addTodo = () => {
    const text = input.trim();
    if (!text) return;
    setTodos((prev) => [...prev, { id: Date.now(), text, completed: false }]);
    setInput("");
  };

  const toggleTodo = (id: number) => {
    setTodos((prev) =>
      prev.map((t) => (t.id === id ? { ...t, completed: !t.completed } : t))
    );
  };

  const deleteTodo = (id: number) => {
    setTodos((prev) => prev.filter((t) => t.id !== id));
  };

  const startEdit = (todo: Todo) => {
    setEditingId(todo.id);
    setEditingText(todo.text);
    setTimeout(() => editInputRef.current?.focus(), 0);
  };

  const commitEdit = () => {
    const text = editingText.trim();
    if (text && editingId !== null) {
      setTodos((prev) =>
        prev.map((t) => (t.id === editingId ? { ...t, text } : t))
      );
    }
    setEditingId(null);
  };

  const cancelEdit = () => {
    setEditingId(null);
  };

  const clearCompleted = () => {
    setTodos((prev) => prev.filter((t) => !t.completed));
  };

  const filtered = todos.filter((t) => {
    if (filter === "active") return !t.completed;
    if (filter === "completed") return t.completed;
    return true;
  });

  const activeCount = todos.filter((t) => !t.completed).length;
  const completedCount = todos.length - activeCount;
  const progressPercent = todos.length === 0 ? 0 : Math.round((completedCount / todos.length) * 100);

  return (
    <div className="min-h-screen bg-gradient-to-br from-violet-100 to-indigo-100 flex items-start justify-center pt-20 px-4">
      <div className="w-full max-w-md">
        <h1 className="text-4xl font-bold text-center text-indigo-700 mb-8 tracking-tight">
          TODO
        </h1>

        {/* Input */}
        <div className="flex gap-2 mb-4">
          <input
            type="text"
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && addTodo()}
            placeholder="新しいタスクを入力..."
            className="flex-1 rounded-xl border border-indigo-200 bg-white px-4 py-3 text-sm text-gray-800 placeholder:text-gray-400 shadow-sm outline-none focus:ring-2 focus:ring-indigo-400 transition"
          />
          <button
            onClick={addTodo}
            className="rounded-xl bg-indigo-600 px-5 py-3 text-sm font-semibold text-white shadow-sm hover:bg-indigo-700 active:scale-95 transition"
          >
            追加
          </button>
        </div>

        {/* Progress */}
        {todos.length > 0 && (
          <div className="mb-4 rounded-2xl bg-white shadow-sm px-4 py-3">
            <div className="flex items-center justify-between text-xs text-gray-500 mb-2">
              <span>{completedCount} / {todos.length} 完了</span>
              <span className="font-semibold text-indigo-600">{progressPercent}%</span>
            </div>
            <div className="h-2 w-full rounded-full bg-indigo-100 overflow-hidden">
              <div
                className="h-full rounded-full bg-indigo-500 transition-all duration-300"
                style={{ width: `${progressPercent}%` }}
                role="progressbar"
                aria-valuenow={progressPercent}
                aria-valuemin={0}
                aria-valuemax={100}
              />
            </div>
          </div>
        )}

        {/* List */}
        <div className="rounded-2xl bg-white shadow-md overflow-hidden">
          {filtered.length === 0 ? (
            <p className="text-center text-gray-400 py-10 text-sm">
              タスクがありません
            </p>
          ) : (
            <ul>
              {filtered.map((todo, i) => (
                <li
                  key={todo.id}
                  className={`flex items-center gap-3 px-4 py-3 group ${
                    i !== 0 ? "border-t border-gray-100" : ""
                  }`}
                >
                  <button
                    onClick={() => toggleTodo(todo.id)}
                    className={`w-5 h-5 rounded-full border-2 flex items-center justify-center flex-shrink-0 transition ${
                      todo.completed
                        ? "bg-indigo-500 border-indigo-500"
                        : "border-gray-300 hover:border-indigo-400"
                    }`}
                  >
                    {todo.completed && (
                      <svg
                        className="w-3 h-3 text-white"
                        fill="none"
                        viewBox="0 0 24 24"
                        stroke="currentColor"
                        strokeWidth={3}
                      >
                        <path
                          strokeLinecap="round"
                          strokeLinejoin="round"
                          d="M5 13l4 4L19 7"
                        />
                      </svg>
                    )}
                  </button>
                  {editingId === todo.id ? (
                    <input
                      ref={editInputRef}
                      type="text"
                      value={editingText}
                      onChange={(e) => setEditingText(e.target.value)}
                      onKeyDown={(e) => {
                        if (e.key === "Enter") commitEdit();
                        if (e.key === "Escape") cancelEdit();
                      }}
                      onBlur={commitEdit}
                      className="flex-1 text-sm text-gray-800 border-b border-indigo-400 outline-none bg-transparent"
                      aria-label="タスクを編集"
                    />
                  ) : (
                    <span
                      onDoubleClick={() => !todo.completed && startEdit(todo)}
                      className={`flex-1 text-sm ${
                        todo.completed
                          ? "line-through text-gray-400"
                          : "text-gray-700 cursor-text"
                      }`}
                    >
                      {todo.text}
                    </span>
                  )}
                  <button
                    onClick={() => deleteTodo(todo.id)}
                    className="opacity-0 group-hover:opacity-100 text-gray-300 hover:text-red-400 transition text-lg leading-none"
                  >
                    &times;
                  </button>
                </li>
              ))}
            </ul>
          )}

          {/* Footer */}
          {todos.length > 0 && (
            <div className="flex items-center justify-between px-4 py-3 border-t border-gray-100 text-xs text-gray-400">
              <span>{activeCount} 件残り</span>
              <div className="flex gap-2">
                {(["all", "active", "completed"] as Filter[]).map((f) => (
                  <button
                    key={f}
                    onClick={() => setFilter(f)}
                    className={`px-2 py-1 rounded-lg transition ${
                      filter === f
                        ? "text-indigo-600 font-semibold"
                        : "hover:text-gray-600"
                    }`}
                  >
                    {f === "all" ? "すべて" : f === "active" ? "未完了" : "完了"}
                  </button>
                ))}
              </div>
              <button
                onClick={clearCompleted}
                className="hover:text-red-400 transition"
              >
                完了を削除
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
