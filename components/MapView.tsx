"use client";

/**
 * =============================================================================
 * КОМПОНЕНТ: Карта с лавочками (MapView)
 * =============================================================================
 *
 * ЧТО ЭТОТ ФАЙЛ ДЕЛАЕТ:
 * 1) Показывает карту Mapbox в полноэкранном режиме.
 * 2) Загружает список лавочек с бэкенда (GET /api/benches) и рисует по ним маркеры.
 * 3) По клику на карту: если пользователь авторизован — форма добавления лавочки; иначе — модалка «Войти».
 * 4) После сохранения форма закрывается, новая лавочка добавляется в список (маркер без перезагрузки).
 *
 * СТРУКТУРА ЛОГИКИ:
 * - refs — ссылки на DOM и объекты Mapbox (карта, маркеры), чтобы управлять ими в useEffect.
 * - state — данные, от которых зависит отрисовка (список лавочек, открыта ли форма, ошибки).
 * - useEffect №1 — один раз при загрузке страницы запрашивает лавочки с API.
 * - useEffect №2 — один раз создаёт карту, вешает контролы и геолокацию.
 * - useEffect №3 — при клике на карту запоминает координаты и открывает форму.
 * - useEffect №4 — когда изменился список лавочек или карта готова, перерисовывает маркеры.
 * - return — разметка: контейнер карты, блок статуса, форма (если открыта).
 * =============================================================================
 */

import { useEffect, useRef, useState } from "react";
import mapboxgl from "mapbox-gl";
import "mapbox-gl/dist/mapbox-gl.css";
import type { Bench } from "@/types/bench";
import { useAuth } from "@/contexts/AuthContext";
import { useToast } from "@/contexts/ToastContext";
import AddBenchForm from "./AddBenchForm";
import BenchDetailModal from "./BenchDetailModal";

/**
 * Короткий тип для пары координат: долгота (lng) и широта (lat).
 * В Mapbox порядок часто [lng, lat], в наших объектах — { lng, lat }.
 */
type LngLat = { lng: number; lat: number };

type MapViewProps = {
  /** Открыть модалку этой лавочки (например из ссылки в уведомлении) */
  initialBenchId?: string | null;
};

export default function MapView({ initialBenchId = null }: MapViewProps) {
  // ===========================================================================
  // REFS (ссылки)
  // ===========================================================================
  // useRef хранит значение между перерисовками, но при его изменении React НЕ
  // перерисовывает компонент. Используем для:
  // - доступа к DOM-элементу (контейнер карты);
  // - хранения экземпляра карты Mapbox и маркеров, чтобы в useEffect их создавать/удалять.

  /** Ссылка на div, в котором будет нарисована карта (привязывается через ref={mapContainerRef}) */
  const mapContainerRef = useRef<HTMLDivElement | null>(null);
  /** Экземпляр карты Mapbox. После создания карты записываем сюда map, чтобы в других useEffect добавлять маркеры */
  const mapRef = useRef<mapboxgl.Map | null>(null);
  /** Маркер «я» (геолокация пользователя). Храним, чтобы при размонтировании удалить с карты */
  const markerRef = useRef<mapboxgl.Marker | null>(null);
  /** Массив маркеров лавочек. При обновлении списка benches старые удаляем, новые создаём */
  const benchMarkersRef = useRef<mapboxgl.Marker[]>([]);

  // ===========================================================================
  // STATE (состояние) — от него зависит, что показывать пользователю
  // ===========================================================================

  /** Есть ли в .env токен Mapbox. Если нет — показываем сообщение вместо карты */
  const [hasToken, setHasToken] = useState(true);
  /** Ошибка геолокации (например 403). Показываем подсказку «Геолокация недоступна», карта всё равно работает */
  const [geoError, setGeoError] = useState<string | null>(null);
  /** Список лавочек с сервера. По этому массиву рисуем маркеры */
  const [benches, setBenches] = useState<Bench[]>([]);
  /** Идёт ли загрузка списка лавочек (пока true — показываем «Загрузка лавочек…») */
  const [benchesLoading, setBenchesLoading] = useState(true);
  /** Ошибка загрузки лавочек (сеть или 500 с API). Показываем текст ошибки */
  const [benchesError, setBenchesError] = useState<string | null>(null);
  /** Карта создана и готова к использованию. Нужно, чтобы не рисовать маркеры до появления карты */
  const [mapReady, setMapReady] = useState(false);

  /**
   * Координаты точки, по которой кликнули — чтобы открыть форму добавления лавочки.
   * null = форма закрыта. { lng, lat } = форма открыта, координаты подставлены в форму.
   */
  const [addBenchCoords, setAddBenchCoords] = useState<LngLat | null>(null);
  /** Лавочка, по которой кликнули — показываем модалку просмотра вместо попапа */
  const [selectedBench, setSelectedBench] = useState<Bench | null>(null);
  /** Геопозиция пользователя (для фильтра «радиус от меня») */
  const [userPosition, setUserPosition] = useState<LngLat | null>(null);
  /** Фильтр: минимальная оценка сообщества (null = все) */
  const [filterMinRating, setFilterMinRating] = useState<number | null>(null);
  /** Фильтр: радиус в км от пользователя (null = без ограничения) */
  const [filterRadiusKm, setFilterRadiusKm] = useState<number | null>(null);

  const { user, setShowAuthModal, setAuthPrompt } = useAuth();
  const { showToast } = useToast();

  // При клике по карте без авторизации открываем модалку «Войти» и не показываем форму.
  useEffect(() => {
    if (addBenchCoords && !user) {
      setAuthPrompt("Войдите, чтобы добавить лавочку в эту точку");
      setShowAuthModal(true);
      setAddBenchCoords(null);
    }
  }, [addBenchCoords, user, setAuthPrompt, setShowAuthModal]);

  // ===========================================================================
  // EFFECT 1: Загрузка лавочек с бэкенда при первой загрузке страницы
  // ===========================================================================
  // useEffect(функция, [зависимости]). Функция выполняется после отрисовки.
  // Пустой массив зависимостей [] = только один раз при монтировании компонента.
  // return () => { ... } — «cleanup»: выполнится при размонтировании или перед повторным запуском effect.

  /** Строит URL для GET /api/benches с учётом фильтров */
  const benchesUrl = () => {
    const params = new URLSearchParams();
    if (filterMinRating != null) params.set("minCommunityRating", String(filterMinRating));
    if (filterRadiusKm != null && userPosition && filterRadiusKm > 0) {
      params.set("maxDistanceKm", String(filterRadiusKm));
      params.set("lat", String(userPosition.lat));
      params.set("lng", String(userPosition.lng));
    }
    const q = params.toString();
    return q ? `/api/benches?${q}` : "/api/benches";
  };

  useEffect(() => {
    let cancelled = false;
    setBenchesLoading(true);
    setBenchesError(null);
    fetch(benchesUrl())
      .then((res) => {
        if (!res.ok) throw new Error(`Ошибка ${res.status}`);
        return res.json();
      })
      .then((data: Bench[]) => {
        if (!cancelled) setBenches(data);
      })
      .catch((err) => {
        if (!cancelled) setBenchesError(err.message ?? "Не удалось загрузить лавочки");
      })
      .finally(() => {
        if (!cancelled) setBenchesLoading(false);
      });
    return () => { cancelled = true; };
  }, [filterMinRating, filterRadiusKm, userPosition?.lat, userPosition?.lng]);

  // ===========================================================================
  // EFFECT 2: Инициализация карты Mapbox (один раз)
  // ===========================================================================
  // Создаём карту, добавляем контролы (зум, геолокация), запрашиваем позицию пользователя.
  // Вешаем обработчик клика по карте: при клике по пустому месту карты сохраняем координаты
  // и открываем форму. Клик по маркеру лавочки обрабатывается в EFFECT 3 (там мы останавливаем
  // всплытие события), поэтому форма не открывается — открывается только попап маркера.

  useEffect(() => {
    const token = process.env.NEXT_PUBLIC_MAPBOX_TOKEN;
    if (!token) {
      setHasToken(false);
      return;
    }

    mapboxgl.accessToken = token;

    if (!mapContainerRef.current || mapRef.current) return; // Уже есть карта или нет контейнера — выходим

    const fallback: LngLat = { lng: 19.2636, lat: 42.4304 };

    const map = new mapboxgl.Map({
      container: mapContainerRef.current,
      style: "mapbox://styles/mapbox/streets-v12",
      center: [fallback.lng, fallback.lat],
      zoom: 12,
    });

    mapRef.current = map;
    setMapReady(true);

    map.addControl(new mapboxgl.NavigationControl(), "top-right");
    map.addControl(
      new mapboxgl.GeolocateControl({
        positionOptions: { enableHighAccuracy: true },
        trackUserLocation: true,
        showUserHeading: true,
      }),
      "top-right"
    );

    if (!navigator.geolocation) {
      setGeoError("Геолокация не поддерживается");
    } else {
      navigator.geolocation.getCurrentPosition(
        (pos) => {
          const me: LngLat = {
            lng: pos.coords.longitude,
            lat: pos.coords.latitude,
          };
          setUserPosition(me);
          map.flyTo({ center: [me.lng, me.lat], zoom: 14 });
          markerRef.current = new mapboxgl.Marker()
            .setLngLat([me.lng, me.lat])
            .addTo(map);
        },
        (err) => setGeoError(err.message)
      );
    }

    // ---------- Клик по карте: если авторизован — запоминаем координаты (откроется форма); иначе — модалка «Войти». ----------
    const onMapClick = (e: mapboxgl.MapMouseEvent) => {
      const { lng, lat } = e.lngLat;
      setAddBenchCoords({ lng, lat });
    };
    map.on("click", onMapClick);

    return () => {
      map.off("click", onMapClick);
      setMapReady(false);
      markerRef.current?.remove();
      mapRef.current?.remove();
      mapRef.current = null;
    };
  }, []);

  // ===========================================================================
  // EFFECT 3: Рисуем маркеры лавочек, когда карта готова и есть список benches
  // ===========================================================================
  // Зависимости [mapReady, benches]: при смене списка (например добавили новую лавочку)
  // перезапускаем effect — старые маркеры удаляем, создаём новые по актуальному массиву.
  //
  // Важно для UX:
  // - Клик по маркеру не должен открывать форму добавления лавочки. Событие клика всплывает
  //   от маркера к карте; мы на DOM-элементе маркера вызываем stopPropagation(), чтобы
  //   карта не получила клик и форма не открылась. Остаётся только попап маркера.
  // - При наведении на маркер: только курсор pointer и лёгкое подсвечивание (filter: brightness).
  //   Не используем transform: scale() — он сбивает позиционирование Mapbox: маркер «улетает»
  //   при наведении и «блуждает» при перетаскивании карты, т.к. карта двигает элемент по координатам,
  //   а масштаб меняет визуальный размер и смещает картинку относительно якоря.
  // - При клике по маркеру: подлетаем к нему (flyTo), чтобы при отдалённом зуме пользователь
  //   сразу увидел точку и попап в удобном масштабе.

  useEffect(() => {
    const map = mapRef.current;
    if (!mapReady || !map || !benches.length) return;

    benchMarkersRef.current.forEach((m) => m.remove());
    benchMarkersRef.current = [];

    /** Зум, к которому подлетаем при клике по маркеру (лавочка хорошо видна) */
    const ZOOM_TO_MARKER = 15;
    const currentUserId = user?.id ?? null;

    benches.forEach((bench) => {
      const marker = new mapboxgl.Marker({ color: "#16a34a" })
        .setLngLat([bench.lng, bench.lat])
        .addTo(map);

      const el = marker.getElement();
      if (el) {
        el.style.cursor = "pointer";
        el.style.transition = "filter 0.15s ease";
        el.addEventListener("mouseenter", () => {
          el.style.filter = "brightness(1.2)";
        });
        el.addEventListener("mouseleave", () => {
          el.style.filter = "";
        });
        el.addEventListener("click", (e: Event) => {
          e.stopPropagation();
          map.flyTo({
            center: [bench.lng, bench.lat],
            zoom: Math.max(map.getZoom(), ZOOM_TO_MARKER),
            duration: 500,
          });
          setSelectedBench(bench);
        });
      }

      benchMarkersRef.current.push(marker);
    });

    return () => {
      benchMarkersRef.current.forEach((m) => m.remove());
      benchMarkersRef.current = [];
    };
  }, [mapReady, benches, user?.id]);

  // Открыть модалку по ссылке из уведомления (?benchId=xxx)
  useEffect(() => {
    if (!initialBenchId || !benches.length) return;
    const bench = benches.find((b) => b.id === initialBenchId);
    if (bench) setSelectedBench(bench);
  }, [initialBenchId, benches]);

  /**
   * Колбэк успешного сохранения новой лавочки из формы.
   * Добавляем лавочку в начало списка — useEffect с зависимостью [benches] перерисует маркеры,
   * и новый маркер появится без перезагрузки страницы и без повторного запроса GET.
   */
  const handleAddBenchSuccess = (newBench: Bench) => {
    setBenches((prev) => [newBench, ...prev]);
    setAddBenchCoords(null);
    showToast("Успешное добавление лавочки!", "success");
  };

  /** Закрыть форму без сохранения */
  const handleAddBenchCancel = () => {
    setAddBenchCoords(null);
  };

  /** Обновить список лавочек (после отзыва — обновить community_rating в открытой модалке) */
  const refetchBenches = () => {
    fetch(benchesUrl())
      .then((r) => (r.ok ? r.json() : Promise.reject(new Error("Ошибка загрузки"))))
      .then((data: Bench[]) => {
        setBenches(data);
        setSelectedBench((prev) =>
          prev ? (data.find((b) => b.id === prev.id) ?? prev) : null
        );
      })
      .catch(() => {});
  };

  // ===========================================================================
  // РЕНДЕР: разметка, которую видит пользователь
  // ===========================================================================

  return (
    <div className="relative h-full w-full">
      {/* Контейнер карты. ref привязывает этот div к mapContainerRef — Mapbox рисует карту внутрь */}
      <div ref={mapContainerRef} className="h-full w-full" />

      {/* Блок статуса и фильтры */}
      <div className="absolute left-3 top-3 flex max-w-[calc(100vw-1.5rem)] flex-col gap-2 sm:max-w-sm">
        <div className="flex flex-col gap-1 rounded-xl bg-black/70 px-3 py-2 text-sm text-white">
          {!hasToken && "Нет NEXT_PUBLIC_MAPBOX_TOKEN"}
          {hasToken && benchesLoading && "Загрузка лавочек…"}
          {hasToken && benchesError && `Лавочки: ${benchesError}`}
          {hasToken && !benchesLoading && !benchesError && (
            <>
              <span>Карта загружена. Клик по карте — добавить лавочку</span>
              {geoError && (
                <span className="text-xs text-white/80">
                  Геолокация недоступна (карта открыта в стартовой точке)
                </span>
              )}
            </>
          )}
        </div>

        {/* Фильтры: рейтинг сообщества и радиус от меня */}
        {hasToken && !benchesLoading && (
          <div className="rounded-xl bg-black/70 px-3 py-2.5 text-sm text-white">
            <p className="mb-1.5 text-xs font-medium text-white/90">Рейтинг сообщества</p>
            <div className="flex flex-wrap gap-1">
              {[
                { label: "Все", value: null },
                { label: "1+", value: 1 },
                { label: "2+", value: 2 },
                { label: "3+", value: 3 },
                { label: "4+", value: 4 },
              ].map(({ label, value }) => (
                <button
                  key={label}
                  type="button"
                  onClick={() => setFilterMinRating(value)}
                  className={`rounded px-2 py-1 text-xs font-medium transition-colors ${
                    filterMinRating === value
                      ? "bg-green-600 text-white"
                      : "bg-white/20 text-white hover:bg-white/30"
                  }`}
                >
                  {label}
                </button>
              ))}
            </div>
            <p className="mt-2 text-xs font-medium text-white/90">Радиус от меня</p>
            {userPosition ? (
              <div className="mt-1 flex flex-col gap-1">
                <div className="flex items-center gap-2">
                  <input
                    type="range"
                    min="0"
                    max="50"
                    step="1"
                    value={filterRadiusKm ?? 0}
                    onChange={(e) =>
                      setFilterRadiusKm(
                        e.target.value === "0" ? null : Number(e.target.value)
                      )
                    }
                    className="h-2 w-24 flex-1 accent-green-500 sm:w-28"
                  />
                  <span className="min-w-[3rem] text-xs">
                    {filterRadiusKm != null && filterRadiusKm > 0
                      ? `${filterRadiusKm} км`
                      : "Все"}
                  </span>
                </div>
              </div>
            ) : (
              <p className="mt-0.5 text-xs text-white/70">
                Включите геолокацию для фильтра по расстоянию
              </p>
            )}
          </div>
        )}
      </div>

      {/* Форма добавления лавочки: только когда есть координаты клика и пользователь авторизован */}
      {addBenchCoords && user && (
        <AddBenchForm
          lng={addBenchCoords.lng}
          lat={addBenchCoords.lat}
          onSuccess={handleAddBenchSuccess}
          onCancel={handleAddBenchCancel}
        />
      )}

      {/* Модалка просмотра лавочки (вместо попапа): скролл при длинном описании, звёзды на всю ширину */}
      {selectedBench && (
        <BenchDetailModal
          bench={selectedBench}
          currentUserId={user?.id ?? null}
          onClose={() => {
            setSelectedBench(null);
            if (typeof window !== "undefined" && initialBenchId) {
              window.history.replaceState({}, "", window.location.pathname);
            }
          }}
          onDeleted={(id) => setBenches((prev) => prev.filter((b) => b.id !== id))}
          onReviewSubmitted={refetchBenches}
        />
      )}
    </div>
  );
}
