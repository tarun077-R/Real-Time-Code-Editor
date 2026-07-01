import { Editor } from "@monaco-editor/react";
import { MonacoBinding } from "y-monaco";
import { useRef, useMemo, useState, useEffect } from "react";
import * as Y from "yjs";
import { SocketIOProvider } from "y-socket.io";

function App() {

  // Monaco Editor ka instance store karega
  const editorRef = useRef(null);

  // Socket Provider ka reference store karega
  const providerRef = useRef(null);

  // MonacoBinding ka reference store karega
  const bindingRef = useRef(null);

  // URL se username read karega agar present hai
  const [username, setUsername] = useState(() => {
    return new URLSearchParams(window.location.search).get("username") || "";
  });

  // Active users sidebar ke liye state
  const [users, setUsers] = useState([]);

  // Shared Yjs Document (Sirf ek baar create hoga)
  const ydoc = useMemo(() => new Y.Doc(), []);

  // Shared Text Object ("monaco" key ke naam se)
  const yText = useMemo(() => ydoc.getText("monaco"), [ydoc]);

  // Monaco Editor mount hone ke baad ye function chalega
  const handleMount = (editor) => {

    // Editor instance save karna
    editorRef.current = editor;

    // Agar provider ready hai to Monaco aur Y.Text ko connect kar do
    if (providerRef.current) {
      bindingRef.current = new MonacoBinding(
        yText,                        // Shared Text
        editor.getModel(),            // Monaco Text Model
        new Set([editor]),            // Editor Instance
        providerRef.current.awareness // Awareness (Cursor / Users)
      );
    }
  };

  // Join Button
  const handleJoin = (e) => {
    e.preventDefault();

    // Username read karna
    const value = e.target.username.value.trim();

    // Empty username allow nahi karna
    if (!value) return;

    // Username state update
    setUsername(value);

    // Username URL me save karna
    window.history.pushState({}, "", "?username=" + value);
  };

  useEffect(() => {

    // Username nahi hai to provider create mat karo
    if (!username) return;

    // Socket.IO Provider Create
    const provider = new SocketIOProvider(
      "/", // Backend URL
      "monaco",                // Room Name
      ydoc,                    // Shared Document
      {
        autoConnect: true,
      }
    );

    // Provider reference save karna
    providerRef.current = provider;

    // Current user ki information awareness me save karna
    provider.awareness.setLocalStateField("user", {
      username,
    });

    // Agar editor pehle se mount ho chuka hai to binding create karo
    if (editorRef.current && !bindingRef.current) {
      bindingRef.current = new MonacoBinding(
        yText,
        editorRef.current.getModel(),
        new Set([editorRef.current]),
        provider.awareness
      );
    }

    // Active Users update karne wala function
    const updateUsers = () => {

      // Awareness se saare users ki information lena
      const states = Array.from(provider.awareness.getStates().values());

      // Username wale users ko filter karke sidebar update karna
      setUsers(
        states
          .filter((state) => state.user && state.user.username)
          .map((state) => state.user)
      );
    };

    // Initial Users Load
    updateUsers();

    // Jab bhi koi join/leave kare users update karo
    provider.awareness.on("change", updateUsers);

    // Browser band hone se pehle user remove karna
    const handleBeforeUnload = () => {
      provider.awareness.setLocalStateField("user", null);
    };

    window.addEventListener("beforeunload", handleBeforeUnload);

    // Cleanup
    return () => {

      // Awareness listener remove karna
      provider.awareness.off("change", updateUsers);

      // Monaco Binding destroy karna
      bindingRef.current?.destroy();

      // Socket disconnect
      provider.disconnect();

      // Event Listener remove karna
      window.removeEventListener(
        "beforeunload",
        handleBeforeUnload
      );
    };

  }, [username, ydoc, yText]);

  // Agar username nahi hai to Join Screen dikhao
  if (!username) {
    return (
      <main className="h-screen w-full bg-gray-950 flex items-center justify-center">

        <form
          onSubmit={handleJoin}
          className="flex flex-col gap-4"
        >

          <input
            name="username"
            placeholder="Enter Username"
            className="p-2 rounded bg-gray-800 text-white"
          />

          <button
            className="bg-amber-300 p-2 rounded font-bold"
          >
            Join
          </button>

        </form>

      </main>
    );
  }

  return (
    <main className="h-screen w-full bg-gray-950 flex gap-4 p-4">

      {/* Active Users Sidebar */}
      <aside className="w-1/4 bg-amber-50 rounded-lg">

        <h2 className="text-2xl font-bold p-4 border-b">
          Active Users
        </h2>

        <ul className="p-4">

          {users.map((user, index) => (
            <li
              key={index}
              className="p-2 bg-gray-800 text-white rounded mb-2"
            >
              {user.username}
            </li>
          ))}

        </ul>

      </aside>

      {/* Monaco Editor */}
      <section className="w-3/4 rounded-lg overflow-hidden">

        <Editor
          height="100%"
          defaultLanguage="javascript"
          defaultValue="// Start Coding..."
          theme="vs-dark"
          onMount={handleMount}
        />

      </section>

    </main>
  );
}

export default App;