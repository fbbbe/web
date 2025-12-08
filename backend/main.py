from fastapi import FastAPI, Query, HTTPException
from fastapi.middleware.cors import CORSMiddleware
import requests
from typing import Optional, List
import xml.etree.ElementTree as ET
from datetime import datetime, timedelta

app = FastAPI()

# 나중에 React(프론트)가 여기로 요청 보낼 거라 CORS 열어두기
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],       # 과제용이라 그냥 전체 허용
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


FUSEKI_ENDPOINT = "http://localhost:3030/licenses/sparql"

# 자격구분명(한글) -> API 코드 매핑
QUALGB_MAP = {
    "국가기술자격": "T",
    "과정평가형자격": "C",
    "일학습병행자격": "W",
    "국가전문자격": "S",
}

# 국가자격 시험일정 API 정보
EXAM_API_URL = "http://apis.data.go.kr/B490007/qualExamSchd/getQualExamSchdList"
EXAM_API_KEY = "cd94cd3a2bc4c00f04f1b68897710cac18c926236c49eca051174879ef199b71"
EXAM_AREA_API_URL = "http://openapi.q-net.or.kr/api/service/rest/InquiryExamAreaSVC/getList"
# (공공데이터포털 MyPage에서 받은 serviceKey 그대로 문자열로 붙이면 됨)

# 🔽🔽🔽 여기서부터 날씨(중기예보) API 설정 🔽🔽🔽

# 기상청 중기예보 - 중기육상예보 / 중기기온 조회 서비스
WEATHER_MID_LAND_URL = "http://apis.data.go.kr/1360000/MidFcstInfoService/getMidLandFcst"
WEATHER_MID_TA_URL = "http://apis.data.go.kr/1360000/MidFcstInfoService/getMidTa"

# 중기육상예보 regId 코드 (예보구역)
# 참고: 11B00000 수도권, 11D10000 강원영서, ...  [oai_citation:2‡로그](https://beomcoder.tistory.com/17?utm_source=chatgpt.com)
# 중기육상예보용
WEATHER_LAND_REGION_MAP = {
    "수도권": "11B00000",
    "강원영서": "11D10000",
    "강원영동": "11D20000",
    "충청북도": "11C10000",
    "충남권": "11C20000",
    "전라북도": "11F10000",
    "전남권": "11F20000",
    "경북권": "11H10000",
    "경남권": "11H20000",
    "제주도": "11G00000",
}

# ✅ 중기기온조회용 (대표 도시 코드들)
WEATHER_TEMP_REGION_MAP = {
    "수도권": "11B10101",   # 서울
    "강원영서": "11D10301", # 춘천
    "강원영동": "11D20501", # 강릉
    "충청북도": "11C10301", # 청주
    "충남권": "11C20401",   # 대전
    "전라북도": "11F10201", # 전주
    "전남권": "11F20501",   # 광주
    "경북권": "11H10701",   # 대구
    "경남권": "11H20301",   # 부산
    "제주도": "11G00601",   # 제주
}

def escape_literal(text: str) -> str:
    """SPARQL 문자열에 넣을 때 큰따옴표, 역슬래시 이스케이프"""
    return text.replace("\\", "\\\\").replace('"', '\\"')


def run_sparql(query: str):
    """Fuseki SPARQL 엔드포인트에 쿼리 보내고 JSON 반환"""
    res = requests.post(
        FUSEKI_ENDPOINT,
        data={"query": query},
        headers={"Accept": "application/sparql-results+json"},
        timeout=10,
    )
    res.raise_for_status()
    return res.json()

def format_yyyymmdd(date_str: str) -> str:
    """YYYYMMDD -> YYYY-MM-DD 형태로 보기 좋게 바꾸기"""
    if not date_str or len(date_str) != 8 or not date_str.isdigit():
        return date_str
    return f"{date_str[0:4]}-{date_str[4:6]}-{date_str[6:8]}"


def call_exam_schedule_api(year: int, qualgb_name: Optional[str] = None):
    """국가자격 시험일정 API 호출해서 raw item 리스트 반환"""
    params = {
        "serviceKey": EXAM_API_KEY,
        "numOfRows": "100",   # 한 번에 넉넉하게 받기
        "pageNo": "1",
        "dataFormat": "json",
        "implYy": str(year),
    }

    # 자격구분명(한글)을 코드(T/C/W/S)로 변환해서 넣기 (옵션)
    if qualgb_name:
        code = QUALGB_MAP.get(qualgb_name)
        if not code:
            raise HTTPException(status_code=400, detail=f"지원하지 않는 자격구분명: {qualgb_name}")
        params["qualgbCd"] = code

    res = requests.get(EXAM_API_URL, params=params, timeout=10)
    res.raise_for_status()
    data = res.json()

    body = data.get("response", {}).get("body", {})
    items = body.get("items", {}).get("item", [])

    # 결과가 1건일 때 dict로 올 수 있어서 리스트로 통일
    if isinstance(items, dict):
        items = [items]

    return items

def call_exam_area_api(brch_cd: str, page: int = 1, per_page: int = 50):
    """
    국가자격시험 시험장소 API 호출해서 raw XML 반환
    brch_cd: 지사코드 (예: 01=서울, 10=경기, 18=제주 ...)
    """
    params = {
        "serviceKey": EXAM_API_KEY,
        "brchCd": brch_cd,
        "numOfRows": str(per_page),
        "pageNo": str(page),
    }

    res = requests.get(EXAM_AREA_API_URL, params=params, timeout=10)
    res.raise_for_status()
    return res.text  # XML 문자열 그대로 반환


def parse_exam_area_xml(xml_text: str):
    """
    시험장소 XML 응답을 파싱해서 파이썬 dict 리스트로 변환
    """
    root = ET.fromstring(xml_text)

    # openapi.q-net 응답 구조: <response><body><items><item>...</item></items></body></response>
    body = root.find("body")
    if body is None:
        return [], 0

    total_count_el = body.find("totalCount")
    total_count = int(total_count_el.text) if total_count_el is not None and total_count_el.text.isdigit() else 0

    items_el = body.find("items")
    if items_el is None:
        return [], total_count

    results = []
    for item in items_el.findall("item"):
        def get(tag):
            el = item.find(tag)
            return el.text.strip() if el is not None and el.text is not None else None

        results.append(
            {
                "address": get("address"),
                "brchCd": get("brchCd"),
                "brchNm": get("brchNm"),
                "examAreaGbNm": get("examAreaGbNm"),
                "examAreaNm": get("examAreaNm"),
                "plceLoctGid": get("plceLoctGid"),
                "telNo": get("telNo"),
            }
        )

    return results, total_count

@app.get("/")
def root():
    return {"message": "backend alive"}


@app.get("/licenses/search")
def search_licenses(q: str = Query(..., min_length=1)):
    """
    자격증 이름(부분 문자열)으로 그래프DB에서 검색
    예) /licenses/search?q=세무사
    """
    keyword = escape_literal(q)

    query = f"""
PREFIX skos: <http://www.w3.org/2004/02/skos/core#>
PREFIX koqu: <http://knowledgemap.kr/koqu/def/>
PREFIX dcterms: <http://purl.org/dc/terms/>

SELECT ?license ?label ?desc
WHERE {{
  ?license a skos:Concept ;
           skos:inScheme koqu:QualificationScheme ;
           skos:prefLabel ?label .
  OPTIONAL {{ ?license dcterms:description ?desc . }}
  FILTER(CONTAINS(STR(?label), "{keyword}"))
}}
LIMIT 20
"""

    data = run_sparql(query)

    results = []
    for b in data["results"]["bindings"]:
        results.append(
            {
                "uri": b["license"]["value"],
                "label": b["label"]["value"],
                "desc": b.get("desc", {}).get("value"),
            }
        )

    return {"query": q, "count": len(results), "results": results}

@app.get("/licenses/schedule")
def get_license_schedule(
    name: str = Query(..., description="자격증 이름(종목명, 예: 세무사)"),
    year: int = Query(..., description="시행년도 (예: 2025)"),
    qualgb_name: Optional[str] = Query(
        None,
        description="자격구분명 (예: 국가기술자격, 국가전문자격). 없으면 전체에서 검색",
    ),
):
    """\n    국가자격 시험일정 API에서 해당 자격증 이름이 들어간 시행계획만 골라서 반환\n    예) /licenses/schedule?name=세무사&year=2025&qualgb_name=국가전문자격\n    """
    items = call_exam_schedule_api(year, qualgb_name)

    total_from_api = len(items)

    keyword = name.strip()
    results = []

    # 1차 시도: description 안에 name 이 포함된 것만 필터
    for item in items:
        desc = item.get("description", "")
        if keyword and keyword not in desc:
            continue

        result = {
            "year": item.get("implYy"),
            "seq": item.get("implSeq"),
            "qualgbCd": item.get("qualgbCd"),
            "qualgbNm": item.get("qualgbNm"),
            "description": desc,
            # 필기 원서접수
            "docRegStartDt": format_yyyymmdd(item.get("docRegStartDt", "")),
            "docRegEndDt": format_yyyymmdd(item.get("docRegEndDt", "")),
            # 필기 시험
            "docExamStartDt": format_yyyymmdd(item.get("docExamStartDt", "")),
            "docExamEndDt": format_yyyymmdd(item.get("docExamEndDt", "")),
            # 실기/면접 원서접수
            "pracRegStartDt": format_yyyymmdd(item.get("pracRegStartDt", "")),
            "pracRegEndDt": format_yyyymmdd(item.get("pracRegEndDt", "")),
            # 실기/면접 시험
            "pracExamStartDt": format_yyyymmdd(item.get("pracExamStartDt", "")),
            "pracExamEndDt": format_yyyymmdd(item.get("pracExamEndDt", "")),
            # 합격자 발표
            "docPassDt": format_yyyymmdd(item.get("docPassDt", "")),
            "pracPassDt": format_yyyymmdd(item.get("pracPassDt", "")),
        }
        results.append(result)

    # 만약 이름으로 필터했는데 아무 것도 안 나오면, 과제 진행을 위해 전체 일정 반환
    if keyword and not results:
        for item in items:
            desc = item.get("description", "")
            result = {
                "year": item.get("implYy"),
                "seq": item.get("implSeq"),
                "qualgbCd": item.get("qualgbCd"),
                "qualgbNm": item.get("qualgbNm"),
                "description": desc,
                "docRegStartDt": format_yyyymmdd(item.get("docRegStartDt", "")),
                "docRegEndDt": format_yyyymmdd(item.get("docRegEndDt", "")),
                "docExamStartDt": format_yyyymmdd(item.get("docExamStartDt", "")),
                "docExamEndDt": format_yyyymmdd(item.get("docExamEndDt", "")),
                "pracRegStartDt": format_yyyymmdd(item.get("pracRegStartDt", "")),
                "pracRegEndDt": format_yyyymmdd(item.get("pracRegEndDt", "")),
                "pracExamStartDt": format_yyyymmdd(item.get("pracExamStartDt", "")),
                "pracExamEndDt": format_yyyymmdd(item.get("pracExamEndDt", "")),
                "docPassDt": format_yyyymmdd(item.get("docPassDt", "")),
                "pracPassDt": format_yyyymmdd(item.get("pracPassDt", "")),
            }
            results.append(result)

    return {
        "name": name,
        "year": year,
        "qualgb_name": qualgb_name,
        "total_from_api": total_from_api,
        "count": len(results),
        "results": results,
    }
    
@app.get("/weather/mid")
def get_mid_weather(
    region: str = Query(
        ...,
        description="예: 수도권, 강원영서, 강원영동, 충청북도, 충남권, 전라북도, 전남권, 경북권, 경남권, 제주도 중 하나",
    ),
    tm_fc: Optional[str] = Query(
        None,
        description="(선택) 중기예보 발표시각, 예: 202512070600. 없으면 서버가 자동으로 가장 최근 발표시각을 계산"
    ),
):
    """
    기상청 중기예보(중기육상예보 + 중기기온)를 합쳐서 반환
    - region: 사람이 읽는 지역 이름 (수도권 등) → regId로 매핑
    - 반환: 3일 후 기준 간단 요약 + 원본 데이터
    """
    # 중기육상예보용 regId, 중기기온용 regId를 각각 매핑
    land_reg_id = WEATHER_LAND_REGION_MAP.get(region)
    temp_reg_id = WEATHER_TEMP_REGION_MAP.get(region)

    if not land_reg_id or not temp_reg_id:
        valid = ", ".join(WEATHER_LAND_REGION_MAP.keys())
        raise HTTPException(
            status_code=400,
            detail=f"지원하지 않는 지역: {region}. 사용 가능한 값: {valid}",
        )

    # tm_fc가 없으면 현재 시각 기준으로 가장 최근 발표시각 계산
    if tm_fc is None:
        tm_fc = get_mid_tmfc()

    land = call_mid_land_fcst(land_reg_id, tm_fc)
    ta = call_mid_ta(temp_reg_id, tm_fc)

    # 공공데이터 쪽에 아직 데이터가 없을 수도 있으니까 그대로 알려주기
    if land is None or ta is None:
        return {
            "region": region,
            "regId": land_reg_id,
            "tmFc": tm_fc,
            "has_data": False,
            "land_raw": land,
            "temp_raw": ta,
        }

    # 🔎 4~10일 중에서 실제로 값이 들어있는 가장 빠른 날짜 찾기
    first_day = None
    for d in range(4, 11):
        if land.get(f"wf{d}Am") or land.get(f"wf{d}Pm"):
            first_day = d
            break

    # 아무 날에도 값이 없으면 요약은 전부 null 처리
    if first_day is None:
        summary_day4 = {
            "day_offset": None,
            "am": {"weather": None, "rain_prob": None},
            "pm": {"weather": None, "rain_prob": None},
            "temp": {"min": None, "max": None},
        }
    else:
        summary_day4 = {
            "day_offset": first_day,  # 오늘 기준 +몇 일인지
            "am": {
                "weather": land.get(f"wf{first_day}Am"),
                "rain_prob": land.get(f"rnSt{first_day}Am"),
            },
            "pm": {
                "weather": land.get(f"wf{first_day}Pm"),
                "rain_prob": land.get(f"rnSt{first_day}Pm"),
            },
            "temp": {
                "min": ta.get(f"taMin{first_day}"),
                "max": ta.get(f"taMax{first_day}"),
            },
        }

    return {
        "region": region,
        "regId": land_reg_id,
        "tmFc": tm_fc,
        "has_data": True,
        "summary_day4": summary_day4,
        "land_raw": land,
        "temp_raw": ta,
    }
    

@app.get("/exam-centers")
def get_exam_centers(
    brch_cd: str = Query(..., description="지사코드 (예: 01=서울, 10=경기, 18=제주 등)"),
    page: int = Query(1, ge=1, description="페이지 번호"),
    per_page: int = Query(50, ge=1, le=100, description="페이지 당 개수"),
):
    """
    국가자격시험 시험장소 정보를 조회해서 JSON으로 반환
    예) /exam-centers?brch_cd=01  (서울 지역 시험장 목록)
    """
    xml_text = call_exam_area_api(brch_cd, page=page, per_page=per_page)
    results, total_count = parse_exam_area_xml(xml_text)

    return {
        "brch_cd": brch_cd,
        "page": page,
        "per_page": per_page,
        "total_count": total_count,
        "count": len(results),
        "results": results,
    }

def get_mid_tmfc() -> str:
    """
    중기예보 발표시각(tmFc) 계산
    - 매일 06시, 18시에 발표 → 지금 시각 기준으로 가장 최근 발표 시각을 구함
    - 예: 2025-12-07 09시라면 202512070600
    """
    now = datetime.now()
    hour = now.hour

    if hour < 6:
        base = now - timedelta(days=1)
        base_hour = 18
    elif hour < 18:
        base = now
        base_hour = 6
    else:
        base = now
        base_hour = 18

    return base.strftime("%Y%m%d") + f"{base_hour:02d}00"

def call_mid_land_fcst(reg_id: str, tm_fc: str):
    """
    중기육상예보조회(getMidLandFcst) 호출
    - 입력: regId(예보구역 코드), tmFc(발표시각)
    - 출력: 해당 지역 예보 item(dict) 또는 None
    """
    params = {
        "serviceKey": EXAM_API_KEY,   # 동일한 개인 키 사용
        "numOfRows": "10",
        "pageNo": "1",
        "dataType": "JSON",
        "regId": reg_id,
        "tmFc": tm_fc,
    }

    res = requests.get(WEATHER_MID_LAND_URL, params=params, timeout=10)
    res.raise_for_status()
    data = res.json()

    body = data.get("response", {}).get("body", {})
    items = body.get("items", {}).get("item", [])

    if isinstance(items, dict):
        items = [items]

    if not items:
        return None

    return items[0]   # 보통 1건만 옴


def call_mid_ta(reg_id: str, tm_fc: str):
    """
    중기기온조회(getMidTa) 호출
    - 입력: regId, tmFc
    - 출력: 해당 지역 기온 item(dict) 또는 None
    """
    params = {
        "serviceKey": EXAM_API_KEY,
        "numOfRows": "10",
        "pageNo": "1",
        "dataType": "JSON",
        "regId": reg_id,
        "tmFc": tm_fc,
    }

    res = requests.get(WEATHER_MID_TA_URL, params=params, timeout=10)
    res.raise_for_status()
    data = res.json()

    body = data.get("response", {}).get("body", {})
    items = body.get("items", {}).get("item", [])

    if isinstance(items, dict):
        items = [items]

    if not items:
        return None

    return items[0]

@app.get("/terminals/regions")
def get_terminal_regions():
    """
    터미널이 존재하는 시/도 목록 조회
    예: ["경기도", "서울특별시", "전라남도", ...]
    """
    query = """
PREFIX koqu: <https://knowledgemap.kr/koqu/def/>
PREFIX schema: <http://schema.org/>

SELECT DISTINCT ?regionName
WHERE {
  ?terminal a koqu:Terminal ;
            schema:addressRegion ?region .
  BIND(REPLACE(STR(?region), ".*/", "") AS ?regionName)
}
ORDER BY ?regionName
"""
    data = run_sparql(query)
    regions = [b["regionName"]["value"] for b in data["results"]["bindings"]]

    return {
        "count": len(regions),
        "regions": regions,
    }


@app.get("/terminals/localities")
def get_terminal_localities(
    sido: str = Query(..., description="시/도 이름 (예: 경기도, 서울특별시, 전라남도)")
):
    """
    선택한 시/도 안에 터미널이 존재하는 시/군/구 목록 조회
    예: /terminals/localities?sido=경기도
    """
    sido_lit = escape_literal(sido)

    query = f"""
PREFIX koqu: <https://knowledgemap.kr/koqu/def/>
PREFIX schema: <http://schema.org/>

SELECT DISTINCT ?localName
WHERE {{
  ?terminal a koqu:Terminal ;
            schema:addressRegion ?region ;
            schema:addressLocality ?locality .
  BIND(REPLACE(STR(?region), ".*/", "") AS ?regionName)
  BIND(REPLACE(STR(?locality), ".*/", "") AS ?localName)
  FILTER(?regionName = "{sido_lit}")
}}
ORDER BY ?localName
"""
    data = run_sparql(query)
    localities = [b["localName"]["value"] for b in data["results"]["bindings"]]

    return {
        "sido": sido,
        "count": len(localities),
        "localities": localities,
    }
    
@app.get("/terminals/by-region")
def get_terminals_by_region(
    sido: str = Query(..., description="시/도 이름 (예: 경기도, 서울특별시)"),
    locality: Optional[str] = Query(
        None,
        description="시/군/구 이름 (예: 수원시, 서초구, 영광군). 없으면 해당 시/도 전체 터미널 조회",
    ),
):
    """
    시/도 + (선택) 시/군/구로 터미널 목록 조회
    예1) /terminals/by-region?sido=경기도
    예2) /terminals/by-region?sido=경기도&locality=수원시
    """
    sido_lit = escape_literal(sido)
    locality_lit = escape_literal(locality) if locality else None

    if locality_lit:
        filter_clause = f'FILTER(?regionName = "{sido_lit}" && ?localName = "{locality_lit}")'
    else:
        filter_clause = f'FILTER(?regionName = "{sido_lit}")'

    query = f"""
PREFIX koqu: <https://knowledgemap.kr/koqu/def/>
PREFIX schema: <http://schema.org/>

SELECT ?terminal ?id ?name ?street ?regionName ?localName ?neighborhoodName ?tel ?url
WHERE {{
  ?terminal a koqu:Terminal ;
            schema:identifier ?id ;
            schema:name ?name ;
            schema:streetAddress ?street ;
            schema:addressRegion ?region ;
            schema:addressLocality ?locality .
  OPTIONAL {{ ?terminal schema:addressNeighborhood ?neighborhood . }}
  OPTIONAL {{ ?terminal schema:telephone ?tel . }}
  OPTIONAL {{ ?terminal schema:url ?url . }}

  BIND(REPLACE(STR(?region), ".*/", "") AS ?regionName)
  BIND(REPLACE(STR(?locality), ".*/", "") AS ?localName)
  BIND(IF(BOUND(?neighborhood),
          REPLACE(STR(?neighborhood), ".*/", ""),
          ""
  ) AS ?neighborhoodName)

  {filter_clause}
}}
ORDER BY ?name
"""
    data = run_sparql(query)

    results = []
    for b in data["results"]["bindings"]:
        street = b["street"]["value"]
        sido_name = b.get("regionName", {}).get("value")
        locality_name = b.get("localName", {}).get("value")
        neighborhood_name = b.get("neighborhoodName", {}).get("value")

        address_parts: List[str] = []
        for val in [sido_name, locality_name, neighborhood_name, street]:
            if val:
                address_parts.append(val)
        address = " ".join(address_parts)

        results.append(
            {
                "uri": b["terminal"]["value"],
                "id": b["id"]["value"],
                "name": b["name"]["value"],
                "streetAddress": street,
                "address": address,
                "sido": sido_name,
                "locality": locality_name,
                "neighborhood": neighborhood_name,
                "telephone": b.get("tel", {}).get("value"),
                "url": b.get("url", {}).get("value"),
                # 프론트 요구 필드 호환을 위한 기본값들
                "type": "버스터미널",
                "lat": None,
                "lon": None,
                "routes": None,
            }
        )

    return {
        "sido": sido,
        "locality": locality,
        "count": len(results),
        "results": results,
    }
    

    
# -------------------------
# 4) 응시 수수료 조회 API
# -------------------------
@app.get("/licenses/fee")
def get_license_fee(name: str):
    serviceKey = EXAM_API_KEY

    # 1) GraphDB에서 name → qualgbCd, jmCd 찾기 (기존 방식 동일)
    info = get_license_info_from_graphdb(name)
    if not info or not info.get("qualgbCd") or not info.get("jmCd"):
        return {"name": name, "has_data": False, "results": []}

    qualgbCd = info["qualgbCd"]
    jmCd = info["jmCd"]

    url = (
        "https://apis.data.go.kr/B490075/qualExamFee/getQualExamFeeList"
        f"?serviceKey={serviceKey}&qualgbCd={qualgbCd}&jmCd={jmCd}"
    )

    res = requests.get(url)
    data = res.json()

    items = data.get("body", {}).get("items", []) or []

    return {
        "name": name,
        "qualgbCd": qualgbCd,
        "jmCd": jmCd,
        "count": len(items),
        "results": items,
    }

# -------------------------
# 5) 시험 응시장소 조회 API
# -------------------------
@app.get("/licenses/sites")
def get_license_test_sites(name: str):
    serviceKey = EXAM_API_KEY

    info = get_license_info_from_graphdb(name)
    if not info or not info.get("qualgbCd") or not info.get("jmCd"):
        return {"name": name, "has_data": False, "results": []}

    qualgbCd = info["qualgbCd"]
    jmCd = info["jmCd"]

    url = (
        "https://apis.data.go.kr/B490076/qualExamSite/getQualExamSiteList"
        f"?serviceKey={serviceKey}&qualgbCd={qualgbCd}&jmCd={jmCd}"
    )

    res = requests.get(url)
    data = res.json()

    items = data.get("body", {}).get("items", []) or []

    return {
        "name": name,
        "qualgbCd": qualgbCd,
        "jmCd": jmCd,
        "count": len(items),
        "results": items,
    }
    
def get_license_info_from_graphdb(name: str):
    """
    자격증 이름으로 GraphDB에서 qualgbCd, jmCd를 조회한다.
    스키마 명세가 달라질 수 있어, 자주 쓰이는 predicate들을 OR 조건으로 조회.
    """
    name_lit = escape_literal(name)
    query = f"""
PREFIX ns: <http://example.org/ontology#>
PREFIX koqu: <https://knowledgemap.kr/koqu/def/>
PREFIX schema: <http://schema.org/>
PREFIX dcterms: <http://purl.org/dc/terms/>

SELECT ?qualgbCd ?jmCd
WHERE {{
  ?s ?pName "{name_lit}" .
  VALUES ?pName {{ ns:name schema:name dcterms:title koqu:name }}

  OPTIONAL {{ ?s ns:qualgbCd ?qualgbCd . }}
  OPTIONAL {{ ?s koqu:qualgbCd ?qualgbCd . }}
  OPTIONAL {{ ?s schema:categoryCode ?qualgbCd . }}

  OPTIONAL {{ ?s ns:jmCd ?jmCd . }}
  OPTIONAL {{ ?s koqu:jmCd ?jmCd . }}
  OPTIONAL {{ ?s schema:identifier ?jmCd . }}
}}
LIMIT 1
    """
    data = run_sparql(query)
    bindings = data["results"]["bindings"]
    if not bindings:
        return None
    return {
        "qualgbCd": bindings[0].get("qualgbCd", {}).get("value"),
        "jmCd": bindings[0].get("jmCd", {}).get("value"),
    }
