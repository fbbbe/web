# 파일: wjdwp.py  (와이드 버전: 한 행 → 여러 새 칼럼)
import pandas as pd
from konlpy.tag import Okt

# === 사용자 설정 ===
INPUT = "종목명칼럼.csv"          # 입력 CSV 파일명
OUTPUT = "종목명_칼럼_와이드.csv"   # 출력 CSV 파일명
TARGET_COL = "종목명"               # 토큰화할 대상 칼럼명
STEM = True                             # 원형복원 사용 여부
USER_WORDS = ["관광","통역","안내사","기능자"]
# ====================

okt = Okt()

# 일부 환경(설치 버전)에선 add_dictionary가 없을 수 있어 안전 가드
if hasattr(okt, "add_dictionary"):
    for w in USER_WORDS:
        try:
            okt.add_dictionary(w, "Noun")
        except Exception:
            # 이미 사전에 있을 때 등은 그냥 무시
            pass

def tokenize(text):
    """문자열을 형태소(단어) 리스트로 변환."""
    if pd.isna(text):
        return []
    s = str(text).strip()
    if not s:
        return []
    return okt.morphs(s, stem=STEM)

def add_wide_token_columns(df: pd.DataFrame, col: str) -> pd.DataFrame:
    """
    대상 칼럼(col)을 토큰화하여 col_tok1, col_tok2, ... 형태의 새 칼럼을 가로(와이드)로 추가.
    각 행마다 토큰 개수가 다르면 부족분은 None으로 채움.
    """
    toks = df[col].apply(tokenize)
    max_len = int(toks.map(len).max() or 0)
    for i in range(max_len):
        df[f"{col}_tok{i+1}"] = toks.apply(lambda lst, k=i: lst[k] if k < len(lst) else None)
    return df

def main():
    # CSV 읽기: 인코딩 모르면 기본 → 실패 시 cp949 재시도
    try:
        df = pd.read_csv(INPUT)
    except UnicodeDecodeError:
        df = pd.read_csv(INPUT, encoding="cp949")

    # 와이드 칼럼 생성
    df = add_wide_token_columns(df, TARGET_COL)

    # 저장
    df.to_csv(OUTPUT, index=False)
    print(f"[완료] {OUTPUT} 저장")
    print(f"[참고] 생성된 예시 칼럼: {TARGET_COL}_tok1, {TARGET_COL}_tok2, ...")

if __name__ == "__main__":
    main()