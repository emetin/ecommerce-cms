import Link from "next/link";
import { getSheetRows, rowsToObjects } from "../../lib/sheets";

export default async function TestPage() {
  let rawRows: string[][] = [];
  let data: Record<string, string>[] = [];
  let errorMessage = "";

  try {
    rawRows = await getSheetRows("products");
    data = rowsToObjects(rawRows);
  } catch (error) {
    errorMessage =
      error instanceof Error ? error.message : "Bilinmeyen bir hata oluştu.";
  }

  return (
    <div className="simple-page">
      <div className="container">
        <Link href="/" className="btn-secondary" style={{ marginBottom: 20 }}>
          ← Home
        </Link>

        <h1>Google Sheets Test</h1>
        <p className="lead">
          Bu sayfa Google Sheets bağlantısının gerçekten çalışıp çalışmadığını
          kontrol etmek için kullanılır. İlk denemede özellikle <strong>Products</strong> tabını okuyoruz.
        </p>

        {errorMessage ? (
          <div className="data-box">
            <h3>Hata</h3>
            <pre>{errorMessage}</pre>
          </div>
        ) : (
          <>
            <div className="data-box" style={{ marginBottom: 24 }}>
              <h3>Ham Veri</h3>
              <pre>{JSON.stringify(rawRows, null, 2)}</pre>
            </div>

            <div className="data-box" style={{ marginBottom: 24 }}>
              <h3>Object Formatı</h3>
              <pre>{JSON.stringify(data, null, 2)}</pre>
            </div>

            <div className="table-wrap">
              <table>
                <thead>
                  <tr>
                    {rawRows[0]?.map((header) => (
                      <th key={header}>{header}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {rawRows.slice(1).length > 0 ? (
                    rawRows.slice(1).map((row, rowIndex) => (
                      <tr key={rowIndex}>
                        {rawRows[0]?.map((_, cellIndex) => (
                          <td key={cellIndex}>{row[cellIndex] || "-"}</td>
                        ))}
                      </tr>
                    ))
                  ) : (
                    <tr>
                      <td colSpan={rawRows[0]?.length || 1}>
                        Henüz veri bulunamadı.
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </>
        )}
      </div>
    </div>
  );
}