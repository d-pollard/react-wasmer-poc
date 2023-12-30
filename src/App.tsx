import {useEffect, useMemo, useState} from 'react'
import './App.css'
import {useWasmerPackage, useWasmerSdk} from "./utils/hooks/useWasmerPackage.tsx";

function App() {
  const sdk = useWasmerSdk();
  const pkg = useWasmerPackage("wasmer/ffmpeg");
  console.log(pkg);
  const [file, setFile] = useState<File | null>(null)
  const fileImage = useMemo(() => {
    if (!file) {
      return null;
    }
    return URL.createObjectURL(file);
  }, [file]);
  const [fileU8Arr, setFileU8Arr] = useState<Uint8Array | null>(null)
  const [outputVideo, setOutputVideo] = useState<string | null>(null);
  useEffect(() => {
    if (!file) return;
    const reader = new FileReader()
    reader.onload = (e: ProgressEvent<FileReader>) => {
      if (!e.target) return;
      const arrayBuffer = e.target.result as ArrayBuffer;
      const u8Arr = new Uint8Array(arrayBuffer);
      setFileU8Arr(u8Arr);
    }
    reader.readAsArrayBuffer(file);
  }, [file]);


  const onConvert = async () => {
    if (!fileU8Arr || sdk.state != "loaded") return;
    const tmp = new sdk.Directory();
    await tmp.writeFile("input.gif", fileU8Arr);
    if (pkg.state != "loaded" || !pkg.pkg.entrypoint) return;
    const instance = await pkg.entrypoint!.run({
      args: [
        "-i",
        "/videos/input.gif", // input file path
        "-movflags",
        "faststart",
        "-pix_fmt",
        "yuv420p",
        "-vf",
        "scale=trunc(iw/2)*2:trunc(ih/2)*2", // video filters
        "/videos/output.mp4", // output file path
      ],
      mount: { "/videos": tmp },
    });

    await instance.stdin?.close();
    const output = await instance.wait();

    if (!output.ok) {
      alert('It messed up');
      return;
    }

    console.log(output.stderr);
    const contents = await tmp.readFile("output.mp4");
    console.log(contents);

    const u8arr = new Uint8Array(contents.buffer);
    const file = new File([u8arr], "output.mp4", {
      type: "video/mp4",
    });
    console.log(file)
    setOutputVideo(URL.createObjectURL(file));
  };
  return (
    <>
      <input
        type="file"
        onClick={() => setFile(null)}
        onChange={e => {
          setFile(e.target.files?.item(0) ?? null);
        }}
      />

      <div>
        <button disabled={!file} onClick={onConvert}>Convert to MP4</button>
      </div>

      <br />

      <div>
        {fileImage && (
          <img src={fileImage} alt="The uploaded file" />
        )}
      </div>

      <div>
        {outputVideo && (
          <video controls crossOrigin="anonymous">
            <source src={outputVideo}/>
          </video>
        )}
      </div>
    </>
  )
}

export default App
