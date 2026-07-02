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



  const [code, setCode] = useState("// Start Coding...");

  const [output, setOutput] = useState("");

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


console.log("Editor Mounted");
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

console.log("Provider Connected");

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
      console.log("Binding Created");

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



  const runCode = () => {

    setOutput("")

  let logs = [];



  const originalLog = console.log;



  console.log = (...args) => {

    logs.push(args.join(" "));

  };



  try {

    eval(code);

  } catch (err) {

    logs.push(err.toString());

  }

finally {

    console.log = originalLog;

  }

  console.log = originalLog;



  setOutput(logs.join("\n"));

};

  // Agar username nahi hai to Join Screen dikhao

  if (!username) {

    return (

      <main className="h-screen w-full bg-gray-950 flex items-center justify-center">



        <form

          onSubmit={handleJoin}

         className="bg-[#161b22] p-8 rounded-xl shadow-xl flex flex-col gap-5 w-96 border border-gray-700"

        >



          <input

            name="username"

            placeholder="Enter Username"

           className="p-3 rounded-lg bg-[#0d1117] border border-gray-700 text-white outline-none focus:border-green-500"

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

<main className="h-screen w-full bg-[#0d1117] flex gap-4 p-4 text-white">



      {/* Active Users Sidebar */}

 <aside className="w-72 bg-[#161b22] rounded-xl border border-gray-700 shadow-lg flex flex-col">



       <h2 className="text-xl font-bold p-4 border-b border-gray-700 flex items-center gap-2">
  👥 Active Users
</h2>



     <ul className="p-4 space-y-3 flex-1 overflow-auto">



          {users.map((user, index) => (

           <li
  key={index}
  className="flex items-center gap-3 bg-[#21262d] p-3 rounded-lg border border-gray-700 hover:bg-[#30363d] transition"
>
  <div className="w-3 h-3 rounded-full bg-green-500"></div>
  <span>{user.username}</span>
</li>

          ))}



        </ul>



      </aside>



      {/* Monaco Editor */}

   

      <section className="flex-1 flex flex-col bg-[#161b22] rounded-xl border border-gray-700 shadow-lg overflow-hidden">



 <div className="flex justify-between items-center px-5 py-3 bg-[#0d1117] border-b border-gray-700">
<h2 className="font-bold text-lg">
    JavaScript Editor
</h2>
    <button
    onClick={runCode}
    className="bg-green-600 hover:bg-green-700 px-5 py-2 rounded-lg text-white font-semibold transition"
>
    ▶ Run
</button>

  </div>



       <Editor

          height="70vh"

          defaultLanguage="javascript"

          defaultValue="// Start Coding..."

          theme="vs-dark"

          onMount={handleMount}

          onChange={

            (value)=>setCode(value || "")

          }

        /> 


<div className="px-4 py-2 border-b border-gray-700 font-semibold">
    Console
</div>
<div className="h-40 overflow-auto p-4 bg-black text-green-400 font-mono text-sm">
    <pre>{output || "No Output"}</pre>
</div>



</section>



    </main>

  );

}



export default App;