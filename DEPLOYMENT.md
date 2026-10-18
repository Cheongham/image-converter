# ChemiCloud / vasnuri.com 배포 안내

예정 주소: https://vasnuri.com/image-converter/

## 업로드

cPanel → Domains → vasnuri.com → Document Root를 통해 실제 웹 루트를 확인합니다. 기본 도메인은 일반적으로 public_html이며, 추가 도메인은 별도 경로일 수 있습니다.

releases/image-converter-cpanel.zip을 **웹 루트에 업로드하고 거기에서 Extract**합니다. ZIP 안에는 image-converter/ 폴더가 있으므로 index.html의 최종 위치는 `문서루트/image-converter/index.html`입니다.

소스 전체 대신 `dist/`의 배포 파일을 사용합니다. 배포 ZIP은 dist 파일만 포함하고 Node.js 소스, 테스트, node_modules, Git 설정이나 인증정보를 포함하지 않습니다.

## 확인

- https://vasnuri.com/image-converter/ : 초기 화면
- PNG → JPG : 선택한 배경색 적용
- JPG → WEBP : 실제 WEBP 파일 생성
- PNG → GIF : GIF 다운로드
- 서로 다른 파일 10개 추가/변환 및 ZIP 다운로드
- 11개 선택 또는 추가 시 초과 파일 차단
- 모바일 화면, 개별 다운로드 및 전체 지우기

## 자주 발생하는 문제

- **404**: cPanel Document Root와 폴더 중첩을 확인합니다. 최종 경로는 `/image-converter/index.html`입니다.
- **403 또는 폴더만 보임**: index.html이 폴더 바로 안에 있는지 확인합니다. 포함된 .htaccess는 이 폴더의 기본 문서를 index.html로 지정합니다.
- **변환기가 멈추거나 Worker 로딩 실패**: assets/worker.js를 포함해 모든 assets 파일을 올렸는지 확인합니다. 브라우저 개발자 도구의 Network/Console에서 404 또는 CSP 차단을 확인합니다.
- **특정 브라우저에서 WEBP 실패**: assets/webp_enc.wasm과 assets/webp_enc_simd.wasm이 업로드되어야 합니다. 포함한 .htaccess는 application/wasm MIME을 지정합니다.
- **업데이트가 반영되지 않음**: 브라우저 강력 새로고침을 하고, 서버/CDN에 별도 캐시가 있다면 해당 경로 캐시를 갱신합니다. 파일명은 고정이므로 HTML·JS·CSS·WASM 전부 함께 갱신합니다.
- **기존 WordPress 페이지와 같은 경로**: 도구가 사용할 `/image-converter/` 경로를 사이트에서 별도 사용 중인지 확인합니다.

이 프로젝트는 서버에 이미지를 보내지 않으며 DB나 API 키가 필요하지 않습니다. 사이트 전체의 기존 WordPress .htaccess나 wp-config.php를 이 프로젝트 파일로 교체하지 마세요.

## 공식 도움말

- 파일 관리자: https://chemicloud.com/kb/article/use-file-manager-cpanel/
- 도메인 웹 루트 확인: https://support.cpanel.net/hc/en-us/articles/1500004206502-How-to-find-the-document-root-of-a-domain
- ZIP 압축 해제: https://support.cpanel.net/hc/en-us/articles/360055141854-Using-File-Manager-To-Extract-Files
