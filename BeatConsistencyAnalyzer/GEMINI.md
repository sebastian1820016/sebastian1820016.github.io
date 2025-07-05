# Beat Consistency Analyzer (Web Version) - Project Information

## Project Goal
Create a web-based version of the Beat Consistency Analyzer, migrating the functionality from the original Python/Pygame application.

## Technology Stack
- **HTML:** For the application structure.
- **CSS:** For styling and layout.
- **JavaScript:** For all application logic, including UI interactions, timing, calculations, and visualization.

## Key Features
- BPM selection via a slider (40-240 BPM).
- Hit count selection via buttons (16, 32, 64, 128).
- Metronome sound guide during the measurement phase.
- High-precision tap timing using `performance.now()`.
- Calculation and display of rhythm stability (standard deviation in both milliseconds and as a percentage).
- Visualization of beat deviation distribution with a histogram.

## Technical Approach
- **Client-Side Only:** The entire application will run in the user's web browser. No backend server is required.
- **High-Precision Timing:** Utilize the `performance.now()` API to capture high-resolution timestamps for accurate analysis.
- **Visualization:** Use a JavaScript charting library (e.g., Chart.js) to render the results histogram dynamically, replacing the static Matplotlib image.
- **Deployment:** The final product will be a set of static files (HTML, CSS, JS) that can be easily hosted on services like GitHub Pages or Netlify.

## Development Log
- **2025年6月29日:** Web版開発開始。Python版からの移行を決定。
- **2025年6月29日:** HTML, CSS, JavaScriptの基本ファイルを作成。
- **2025年6月29日:** UI操作（BPMスライダー、打数ボタン）と画面遷移（スタート→演奏中）を実装。
- **2025年6月29日:** 演奏中の打鍵記録とメトロノーム音を実装。
- **2025年6月29日:** 結果の計算と表示（統計情報、ヒストグラム）を実装。
- **2025年6月29日:** 状態遷移（結果→スタート）を実装。
- **2025年6月29日:** デバッグ機能（ログ表示、コピーボタン）を実装。
- **2025年6月29日:** ヒストグラムの表示不具合を修正。
- **2025年6月29日:** 初回起動時の画面崩れを修正。
- **2025年6月29日:** ヒストグラムのビン設定をPython版と一致するように調整。
- **2025年6月29日:** デバッグフラグとデバッグログ表示領域の連動を修正。
- **2025年6月29日:** GitHub Pagesでの公開準備を開始。
- **2025年6月29日:** レポジトリ: https://github.com/sebastian1820016/beat-consistency-analyzer
- **2025年6月29日:** 公開URL   : https://sebastian1820016.github.io/beat-consistency-analyzer/
