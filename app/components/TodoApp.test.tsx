import { describe, it, expect, beforeEach, vi } from "vitest";
import { render, screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import TodoApp from "./TodoApp";

// localStorage のモック
const localStorageMock = (() => {
  let store: Record<string, string> = {};
  return {
    getItem: (key: string) => store[key] ?? null,
    setItem: (key: string, value: string) => {
      store[key] = value;
    },
    removeItem: (key: string) => {
      delete store[key];
    },
    clear: () => {
      store = {};
    },
  };
})();

Object.defineProperty(window, "localStorage", { value: localStorageMock });

beforeEach(() => {
  localStorageMock.clear();
});

// ----------------------------------------
// 初期表示
// ----------------------------------------
describe("初期表示", () => {
  it("「タスクがありません」が表示される", () => {
    render(<TodoApp />);
    expect(screen.getByText("タスクがありません")).toBeInTheDocument();
  });

  it("入力フィールドが空の状態で表示される", () => {
    render(<TodoApp />);
    const input = screen.getByPlaceholderText("新しいタスクを入力...");
    expect(input).toHaveValue("");
  });

  it("フッター（件数・フィルター）はタスクが0件のとき表示されない", () => {
    render(<TodoApp />);
    expect(screen.queryByText(/件残り/)).not.toBeInTheDocument();
  });
});

// ----------------------------------------
// localStorage からの復元
// ----------------------------------------
describe("localStorage からの復元", () => {
  it("保存済みタスクがあれば起動時に読み込まれる", () => {
    localStorageMock.setItem(
      "todos",
      JSON.stringify([{ id: 1, text: "保存済みタスク", completed: false }])
    );
    render(<TodoApp />);
    expect(screen.getByText("保存済みタスク")).toBeInTheDocument();
  });

  it("完了済みタスクも正しく復元される", () => {
    localStorageMock.setItem(
      "todos",
      JSON.stringify([{ id: 1, text: "完了タスク", completed: true }])
    );
    render(<TodoApp />);
    const span = screen.getByText("完了タスク");
    expect(span).toHaveClass("line-through");
  });
});

// ----------------------------------------
// タスク追加
// ----------------------------------------
describe("タスク追加", () => {
  it("テキストを入力して「追加」ボタンをクリックするとタスクが追加される", async () => {
    const user = userEvent.setup();
    render(<TodoApp />);

    await user.type(screen.getByPlaceholderText("新しいタスクを入力..."), "買い物する");
    await user.click(screen.getByRole("button", { name: "追加" }));

    expect(screen.getByText("買い物する")).toBeInTheDocument();
  });

  it("Enter キーを押してもタスクが追加される", async () => {
    const user = userEvent.setup();
    render(<TodoApp />);

    await user.type(screen.getByPlaceholderText("新しいタスクを入力..."), "掃除する{Enter}");

    expect(screen.getByText("掃除する")).toBeInTheDocument();
  });

  it("タスク追加後に入力フィールドがクリアされる", async () => {
    const user = userEvent.setup();
    render(<TodoApp />);

    const input = screen.getByPlaceholderText("新しいタスクを入力...");
    await user.type(input, "タスク");
    await user.click(screen.getByRole("button", { name: "追加" }));

    expect(input).toHaveValue("");
  });

  it("空白のみの入力ではタスクが追加されない", async () => {
    const user = userEvent.setup();
    render(<TodoApp />);

    await user.type(screen.getByPlaceholderText("新しいタスクを入力..."), "   {Enter}");

    expect(screen.getByText("タスクがありません")).toBeInTheDocument();
  });

  it("前後の空白がトリムされてタスクが追加される", async () => {
    const user = userEvent.setup();
    render(<TodoApp />);

    await user.type(screen.getByPlaceholderText("新しいタスクを入力..."), "  タスク  {Enter}");

    expect(screen.getByText("タスク")).toBeInTheDocument();
  });

  it("複数のタスクを追加できる", async () => {
    const user = userEvent.setup();
    render(<TodoApp />);

    const input = screen.getByPlaceholderText("新しいタスクを入力...");
    await user.type(input, "タスク1{Enter}");
    await user.type(input, "タスク2{Enter}");
    await user.type(input, "タスク3{Enter}");

    expect(screen.getByText("タスク1")).toBeInTheDocument();
    expect(screen.getByText("タスク2")).toBeInTheDocument();
    expect(screen.getByText("タスク3")).toBeInTheDocument();
  });
});

// ----------------------------------------
// タスクの完了切り替え
// ----------------------------------------
describe("タスクの完了切り替え", () => {
  it("チェックボタンをクリックするとタスクが完了状態になる", async () => {
    const user = userEvent.setup();
    render(<TodoApp />);

    await user.type(screen.getByPlaceholderText("新しいタスクを入力..."), "テストタスク{Enter}");

    const listItem = screen.getByText("テストタスク").closest("li")!;
    const toggleBtn = within(listItem).getAllByRole("button")[0];
    await user.click(toggleBtn);

    expect(screen.getByText("テストタスク")).toHaveClass("line-through");
  });

  it("完了状態のタスクを再クリックすると未完了に戻る", async () => {
    const user = userEvent.setup();
    render(<TodoApp />);

    await user.type(screen.getByPlaceholderText("新しいタスクを入力..."), "テストタスク{Enter}");

    const listItem = screen.getByText("テストタスク").closest("li")!;
    const toggleBtn = within(listItem).getAllByRole("button")[0];
    await user.click(toggleBtn); // 完了
    await user.click(toggleBtn); // 未完了に戻す

    expect(screen.getByText("テストタスク")).not.toHaveClass("line-through");
  });
});

// ----------------------------------------
// タスク削除
// ----------------------------------------
describe("タスク削除", () => {
  it("削除ボタン（×）をクリックするとタスクが削除される", async () => {
    const user = userEvent.setup();
    render(<TodoApp />);

    await user.type(screen.getByPlaceholderText("新しいタスクを入力..."), "削除するタスク{Enter}");
    expect(screen.getByText("削除するタスク")).toBeInTheDocument();

    const listItem = screen.getByText("削除するタスク").closest("li")!;
    const deleteBtn = within(listItem).getAllByRole("button")[1];
    await user.click(deleteBtn);

    expect(screen.queryByText("削除するタスク")).not.toBeInTheDocument();
  });

  it("全タスクを削除すると「タスクがありません」が表示される", async () => {
    const user = userEvent.setup();
    render(<TodoApp />);

    await user.type(screen.getByPlaceholderText("新しいタスクを入力..."), "タスク{Enter}");

    const listItem = screen.getByText("タスク").closest("li")!;
    const deleteBtn = within(listItem).getAllByRole("button")[1];
    await user.click(deleteBtn);

    expect(screen.getByText("タスクがありません")).toBeInTheDocument();
  });
});

// ----------------------------------------
// フィルター
// ----------------------------------------
describe("フィルター", () => {
  async function setupTodos(user: ReturnType<typeof userEvent.setup>) {
    render(<TodoApp />);
    const input = screen.getByPlaceholderText("新しいタスクを入力...");

    await user.type(input, "未完了タスク{Enter}");
    await user.type(input, "完了タスク{Enter}");

    // 「完了タスク」を完了状態にする
    const completedItem = screen.getByText("完了タスク").closest("li")!;
    const toggleBtn = within(completedItem).getAllByRole("button")[0];
    await user.click(toggleBtn);
  }

  it("「未完了」フィルターで未完了のタスクのみ表示される", async () => {
    const user = userEvent.setup();
    await setupTodos(user);

    await user.click(screen.getByRole("button", { name: "未完了" }));

    expect(screen.getByText("未完了タスク")).toBeInTheDocument();
    expect(screen.queryByText("完了タスク")).not.toBeInTheDocument();
  });

  it("「完了」フィルターで完了済みのタスクのみ表示される", async () => {
    const user = userEvent.setup();
    await setupTodos(user);

    await user.click(screen.getByRole("button", { name: "完了" }));

    expect(screen.queryByText("未完了タスク")).not.toBeInTheDocument();
    expect(screen.getByText("完了タスク")).toBeInTheDocument();
  });

  it("「すべて」フィルターで全タスクが表示される", async () => {
    const user = userEvent.setup();
    await setupTodos(user);

    await user.click(screen.getByRole("button", { name: "未完了" }));
    await user.click(screen.getByRole("button", { name: "すべて" }));

    expect(screen.getByText("未完了タスク")).toBeInTheDocument();
    expect(screen.getByText("完了タスク")).toBeInTheDocument();
  });
});

// ----------------------------------------
// 完了をまとめて削除
// ----------------------------------------
describe("完了をまとめて削除", () => {
  it("「完了を削除」で完了済みタスクのみが削除される", async () => {
    const user = userEvent.setup();
    render(<TodoApp />);

    const input = screen.getByPlaceholderText("新しいタスクを入力...");
    await user.type(input, "未完了タスク{Enter}");
    await user.type(input, "完了タスク{Enter}");

    const completedItem = screen.getByText("完了タスク").closest("li")!;
    const toggleBtn = within(completedItem).getAllByRole("button")[0];
    await user.click(toggleBtn);

    await user.click(screen.getByRole("button", { name: "完了を削除" }));

    expect(screen.getByText("未完了タスク")).toBeInTheDocument();
    expect(screen.queryByText("完了タスク")).not.toBeInTheDocument();
  });
});

// ----------------------------------------
// 件数表示
// ----------------------------------------
describe("件数表示", () => {
  it("未完了タスクの件数が正しく表示される", async () => {
    const user = userEvent.setup();
    render(<TodoApp />);

    const input = screen.getByPlaceholderText("新しいタスクを入力...");
    await user.type(input, "タスク1{Enter}");
    await user.type(input, "タスク2{Enter}");
    await user.type(input, "タスク3{Enter}");

    expect(screen.getByText("3 件残り")).toBeInTheDocument();
  });

  it("タスクを完了すると件数が減る", async () => {
    const user = userEvent.setup();
    render(<TodoApp />);

    const input = screen.getByPlaceholderText("新しいタスクを入力...");
    await user.type(input, "タスク1{Enter}");
    await user.type(input, "タスク2{Enter}");

    const listItem = screen.getByText("タスク1").closest("li")!;
    const toggleBtn = within(listItem).getAllByRole("button")[0];
    await user.click(toggleBtn);

    expect(screen.getByText("1 件残り")).toBeInTheDocument();
  });
});

// ----------------------------------------
// localStorage への保存
// ----------------------------------------
describe("localStorage への保存", () => {
  it("タスク追加後に localStorage に保存される", async () => {
    const user = userEvent.setup();
    render(<TodoApp />);

    await user.type(screen.getByPlaceholderText("新しいタスクを入力..."), "保存テスト{Enter}");

    const saved = JSON.parse(localStorageMock.getItem("todos") ?? "[]");
    expect(saved).toHaveLength(1);
    expect(saved[0].text).toBe("保存テスト");
    expect(saved[0].completed).toBe(false);
  });

  it("タスク完了後に localStorage が更新される", async () => {
    const user = userEvent.setup();
    render(<TodoApp />);

    await user.type(screen.getByPlaceholderText("新しいタスクを入力..."), "保存テスト{Enter}");

    const listItem = screen.getByText("保存テスト").closest("li")!;
    const toggleBtn = within(listItem).getAllByRole("button")[0];
    await user.click(toggleBtn);

    const saved = JSON.parse(localStorageMock.getItem("todos") ?? "[]");
    expect(saved[0].completed).toBe(true);
  });
});

// ----------------------------------------
// 進捗率表示
// ----------------------------------------
describe("進捗率表示", () => {
  it("タスクが0件のときプログレスバーが表示されない", () => {
    render(<TodoApp />);
    expect(screen.queryByRole("progressbar")).not.toBeInTheDocument();
  });

  it("タスクが1件あり未完了のとき 0% が表示される", async () => {
    const user = userEvent.setup();
    render(<TodoApp />);

    await user.type(screen.getByPlaceholderText("新しいタスクを入力..."), "タスク{Enter}");

    expect(screen.getByText("0%")).toBeInTheDocument();
    expect(screen.getByText("0 / 1 完了")).toBeInTheDocument();
    expect(screen.getByRole("progressbar")).toHaveAttribute("aria-valuenow", "0");
  });

  it("全タスクを完了すると 100% が表示される", async () => {
    const user = userEvent.setup();
    render(<TodoApp />);

    await user.type(screen.getByPlaceholderText("新しいタスクを入力..."), "タスク{Enter}");

    const listItem = screen.getByText("タスク").closest("li")!;
    await user.click(within(listItem).getAllByRole("button")[0]);

    expect(screen.getByText("100%")).toBeInTheDocument();
    expect(screen.getByText("1 / 1 完了")).toBeInTheDocument();
    expect(screen.getByRole("progressbar")).toHaveAttribute("aria-valuenow", "100");
  });

  it("3件中1件完了で 33% が表示される", async () => {
    const user = userEvent.setup();
    render(<TodoApp />);

    const input = screen.getByPlaceholderText("新しいタスクを入力...");
    await user.type(input, "タスク1{Enter}");
    await user.type(input, "タスク2{Enter}");
    await user.type(input, "タスク3{Enter}");

    const listItem = screen.getByText("タスク1").closest("li")!;
    await user.click(within(listItem).getAllByRole("button")[0]);

    expect(screen.getByText("33%")).toBeInTheDocument();
    expect(screen.getByText("1 / 3 完了")).toBeInTheDocument();
  });
});

// ----------------------------------------
// タスク編集
// ----------------------------------------
describe("タスク編集", () => {
  it("タスクテキストをダブルクリックすると編集モードになる", async () => {
    const user = userEvent.setup();
    render(<TodoApp />);

    await user.type(screen.getByPlaceholderText("新しいタスクを入力..."), "元のテキスト{Enter}");
    await user.dblClick(screen.getByText("元のテキスト"));

    expect(screen.getByRole("textbox", { name: "タスクを編集" })).toBeInTheDocument();
  });

  it("編集後 Enter で内容が更新される", async () => {
    const user = userEvent.setup();
    render(<TodoApp />);

    await user.type(screen.getByPlaceholderText("新しいタスクを入力..."), "変更前{Enter}");
    await user.dblClick(screen.getByText("変更前"));

    const editInput = screen.getByRole("textbox", { name: "タスクを編集" });
    await user.clear(editInput);
    await user.type(editInput, "変更後{Enter}");

    expect(screen.queryByText("変更前")).not.toBeInTheDocument();
    expect(screen.getByText("変更後")).toBeInTheDocument();
  });

  it("編集後 Escape でキャンセルされ元のテキストが保持される", async () => {
    const user = userEvent.setup();
    render(<TodoApp />);

    await user.type(screen.getByPlaceholderText("新しいタスクを入力..."), "元のテキスト{Enter}");
    await user.dblClick(screen.getByText("元のテキスト"));

    const editInput = screen.getByRole("textbox", { name: "タスクを編集" });
    await user.clear(editInput);
    await user.type(editInput, "途中の入力{Escape}");

    expect(screen.getByText("元のテキスト")).toBeInTheDocument();
  });

  it("空白のみにして Enter しても更新されず元のテキストが保持される", async () => {
    const user = userEvent.setup();
    render(<TodoApp />);

    await user.type(screen.getByPlaceholderText("新しいタスクを入力..."), "元のテキスト{Enter}");
    await user.dblClick(screen.getByText("元のテキスト"));

    const editInput = screen.getByRole("textbox", { name: "タスクを編集" });
    await user.clear(editInput);
    await user.type(editInput, "   {Enter}");

    expect(screen.getByText("元のテキスト")).toBeInTheDocument();
  });

  it("完了済みタスクはダブルクリックしても編集モードにならない", async () => {
    const user = userEvent.setup();
    render(<TodoApp />);

    await user.type(screen.getByPlaceholderText("新しいタスクを入力..."), "完了タスク{Enter}");

    const listItem = screen.getByText("完了タスク").closest("li")!;
    await user.click(within(listItem).getAllByRole("button")[0]); // 完了にする
    await user.dblClick(screen.getByText("完了タスク"));

    expect(screen.queryByRole("textbox", { name: "タスクを編集" })).not.toBeInTheDocument();
  });
});
