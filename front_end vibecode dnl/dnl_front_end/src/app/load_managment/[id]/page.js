"use client";
import { useEffect, useState } from "react";
import { useRouter, useParams } from "next/navigation";
import { getLoad } from "../../../utils/api";
import LoadDetailsTemplate from "../../../components/LoadDetailsTemplate";

export default function LoadDetailPage() {
  const router = useRouter();
  const { id } = useParams();
  const [load, setLoad] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    async function fetchLoad() {
      try {
        const data = await getLoad(id);
        setLoad(data);
        setError("");
      } catch (e) {
        setError(e.message);
      }
      setLoading(false);
    }
    fetchLoad();
  }, [id]);

  const handlePrint = () => {
    window.print();
  };

  const handleDownloadPDF = async () => {
    if (!load) return;
    const jsPDF = (await import("jspdf")).jsPDF;
    const doc = new jsPDF();
    let y = 10;
    doc.setFontSize(16);
    doc.text("Load Details", 10, y);
    y += 10;
    doc.setFontSize(12);
    Object.entries(load).forEach(([key, value]) => {
      doc.text(`${key}: ${value}`, 10, y);
      y += 8;
    });
    doc.save(`load_${id}.pdf`);
  };

  if (loading) return <div className="p-8">Loading...</div>;
  if (error) return <div className="p-8 text-red-600">{error}</div>;
  if (!load) return <div className="p-8">No data found.</div>;

  return (
    <div className="max-w-2xl mx-auto bg-white rounded-xl shadow-lg p-8 mt-8">
      <h1 className="text-2xl font-bold mb-6 text-blue-900">Load Details</h1>
      <div className="mb-6">
        <LoadDetailsTemplate load={load} />
      </div>
      <div className="flex gap-4 mt-6">
        <button onClick={handlePrint} className="bg-blue-600 text-white px-4 py-2 rounded shadow hover:bg-blue-700">Print</button>
        <button onClick={handleDownloadPDF} className="bg-green-600 text-white px-4 py-2 rounded shadow hover:bg-green-700">Download as PDF</button>
        <button onClick={() => router.back()} className="bg-gray-200 text-gray-700 px-4 py-2 rounded shadow hover:bg-gray-300">Back</button>
      </div>
    </div>
  );
}
