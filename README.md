# VASNURI 이미지 변환기

GIF · JPG · PNG · WEBP 이미지를 **한 번에 최대 10개** 변환하는 정적 웹 도구입니다. 이미지 확인·변환·ZIP 생성은 방문자의 브라우저 안에서 수행합니다.

예정 배포 주소: **https://vasnuri.com/image-converter/**

> 저장소에 올리는 것과 케미클라우드 웹사이트에 게시하는 것은 별개입니다. 서버 업로드는 아래 배포 안내대로 진행합니다.

## 주요 기능

- 네 형식 간 변환 및 `.jpeg` 입력 지원
- 파일 선택 / 드래그 앤 드롭 / 개별 제거 / 전체 지우기
- 대기열 전체를 기준으로 최대 10개 제한
- 파일별 다운로드 및 이름 중복을 피한 ZIP 일괄 다운로드
- JPG·WEBP 품질 조절, JPG 투명 영역 배경색 선택
- PNG·WEBP 투명도, GIF 단색 투명도 지원
- 사진의 EXIF 방향 적용, 작업 중단, 개별 오류 및 진행률 표시
- WEBP 저장을 지원하지 않는 브라우저를 위한 로컬 WASM 보조 인코더
- 외부 CDN·이미지 업로드 API·추적 스크립트 없음

## 애니메이션 및 품질 안내

- GIF·WEBP·APNG를 **다른 형식으로 변환하면 첫 프레임만 정지 이미지로 저장**합니다.
- 새로 생성하는 GIF는 최대 256색의 정지 이미지입니다. 여러 이미지를 이어 붙이는 애니메이션 제작 기능은 없습니다.
- 입력과 출력이 같은 형식이면 원본 파일 바이트를 그대로 보존합니다. 애니메이션과 메타데이터도 유지되며, 품질 설정은 적용되지 않습니다.
- JPG는 투명도를 지원하지 않으므로 선택한 배경색으로 합성합니다.
- 다른 형식으로 바꾼 뒤 용량이 더 커질 수도 있습니다. GIF 색상과 투명한 경계는 원본과 달라질 수 있습니다.

## 실행 및 개발

Node.js 22 이상을 사용합니다.

```bash
npm ci
npm run check
npm test
npm run build
npm run preview
```

브라우저에서 `http://127.0.0.1:8080/dist/`를 엽니다. `file://`로 HTML을 직접 열면 모듈·Web Worker·WASM의 보안 제한 때문에 변환을 실행할 수 없습니다. 웹 서버를 통해 열어주세요.

브라우저 검증을 재현하려면:

```bash
npm run test:browser-build
npm run preview
```

`http://127.0.0.1:8080/tests/browser.html`에서 **전체 검증 실행**을 누릅니다. 실제 이미지 4종의 16개 조합, 투명도, 첫 프레임, GIF 원본 유지, EXIF 방향, WASM 보조 인코더, ZIP, 손상 파일, 실제 UI의 10개 제한 및 결과 무효화를 검사합니다. 테스트 픽스처는 테스트 목적으로 생성한 이미지입니다.

## 케미클라우드 배포

[케미클라우드 배포 ZIP 다운로드](https://github.com/Cheongham/image-converter/raw/refs/heads/main/releases/image-converter-cpanel.zip)

ZIP은 **`image-converter/` 폴더를 포함**합니다. cPanel의 `vasnuri.com` 문서 루트(기본 도메인은 일반적으로 `public_html`)에 업로드한 뒤, **그 문서 루트에서 압축을 풀면** 다음과 같이 배치됩니다.

```text
public_html/
├── wp-admin/
├── wp-content/
└── image-converter/
    ├── index.html
    ├── .htaccess
    ├── THIRD_PARTY_NOTICES.md
    └── assets/
        ├── app.js
        ├── worker.js
        ├── styles.css
        ├── favicon.svg
        ├── webp_enc.wasm
        └── webp_enc_simd.wasm
```

1. cPanel → **Domains**에서 `vasnuri.com`의 **Document Root**를 클릭합니다.
2. 파일 관리자에서 ZIP을 업로드하고 **Extract**를 실행합니다.
3. 압축을 풀 위치를 해당 도메인 문서 루트로 지정합니다. ZIP에 폴더가 있으므로 `image-converter/image-converter/`로 중첩하지 않습니다.
4. `https://vasnuri.com/image-converter/`에서 변환·다운로드를 확인합니다.

소스를 수정한 경우 `npm run build` 후 `dist/`의 파일 전체를 서버의 `image-converter/` 폴더에 올립니다. PHP·데이터베이스·서버 Node.js는 필요하지 않습니다. **`.htaccess`는 이 도구의 하위 폴더 안에 두는 설정 파일**이며 기본 문서, WASM MIME과 갱신 캐시를 지정합니다.

수동 ZIP 재생성:

```bash
npm run package
```

배포 문제 해결은 [DEPLOYMENT.md](./DEPLOYMENT.md)를 참고하세요.

## 제한과 검증 범위

- 최대 10개, 파일당 30MB, 2,500만 화소, 한 변 16,384px까지
- GIF 생성은 최대 800만 화소
- Worker·OffscreenCanvas·createImageBitmap를 지원하는 최신 브라우저 필요
- 개발 검증은 Chromium 기반 브라우저에서 수행했으며, 실제 Safari·Firefox 기기 검증은 별도 필요
- 브라우저 작업자와 WASM 사용을 차단하는 사이트 보안 정책이 있는 경우 해당 경로의 정책 조정 필요

## 구조

- `src/`: UI, 파일 검증, 변환 작업자, GIF 인코더 어댑터
- `dist/`: 바로 배포할 정적 파일
- `scripts/`: 빌드, 로컬 서버, 테스트 빌드, 배포 패키징
- `tests/`: 생성한 이미지 픽스처와 검증 코드
- `releases/`: 케미클라우드용 ZIP

## 라이선스

프로젝트 코드: [MIT](./LICENSE). 배포되는 gifenc, fflate, jSquash/WebP, wasm-feature-detect 및 libwebp의 라이선스는 `dist/THIRD_PARTY_NOTICES.md`에 포함했습니다.
