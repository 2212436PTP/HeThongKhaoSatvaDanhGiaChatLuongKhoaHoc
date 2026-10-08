/**
 * Thư viện xử lý Định vị GPS & Xác thực Bán kính Phòng máy Trung tâm ITC
 * Địa chỉ: Số 01 Phù Đổng Thiên Vương, Phường 8, TP. Đà Lạt (Trường Đại học Đà Lạt)
 */

export const ITC_CENTER_COORDINATES = {
    latitude: 11.9545,
    longitude: 108.4447,
    name: 'Trung tâm Tin học ITC - Trường Đại học Đà Lạt',
    address: '01 Phù Đổng Thiên Vương, Phường 8, TP. Đà Lạt, Lâm Đồng',
    allowedRadiusMeters: 300 // Bán kính phòng máy cho phép: 300 mét
};

function toRad(deg: number): number {
    return (deg * Math.PI) / 180;
}

/**
 * Tính khoảng cách giữa 2 tọa độ GPS theo công thức Haversine (đơn vị: mét)
 */
export function calculateDistanceMeters(
    lat1: number,
    lon1: number,
    lat2: number = ITC_CENTER_COORDINATES.latitude,
    lon2: number = ITC_CENTER_COORDINATES.longitude
): number {
    const R = 6371e3; // Bán kính Trái Đất (mét)
    const dLat = toRad(lat2 - lat1);
    const dLon = toRad(lon2 - lon1);

    const a =
        Math.sin(dLat / 2) * Math.sin(dLat / 2) +
        Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) *
        Math.sin(dLon / 2) * Math.sin(dLon / 2);

    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
    return Math.round(R * c);
}

export interface GPSCheckResult {
    success: boolean;
    latitude?: number;
    longitude?: number;
    accuracy?: number;
    distanceMeters?: number;
    isWithinRadius?: boolean;
    isSimulated?: boolean;
    message: string;
}

/**
 * Lấy tọa độ GPS thực tế từ trình duyệt thiết bị (Mobile/Laptop)
 */
export function getCurrentGPSPosition(): Promise<{ latitude: number; longitude: number; accuracy: number }> {
    return new Promise((resolve, reject) => {
        if (!navigator.geolocation) {
            reject(new Error('Trình duyệt của bạn không hỗ trợ định vị GPS (Geolocation API).'));
            return;
        }

        navigator.geolocation.getCurrentPosition(
            (pos) => {
                resolve({
                    latitude: pos.coords.latitude,
                    longitude: pos.coords.longitude,
                    accuracy: Math.round(pos.coords.accuracy || 10)
                });
            },
            (err) => {
                let msg = 'Không thể lấy tọa độ vị trí.';
                switch (err.code) {
                    case err.PERMISSION_DENIED:
                        msg = 'Bạn đã từ chối quyền truy cập vị trí. Vui lòng cho phép quyền truy cập vị trí trong cài đặt trình duyệt để điểm danh.';
                        break;
                    case err.POSITION_UNAVAILABLE:
                        msg = 'Tín hiệu GPS không khả dụng hoặc thiết bị không xác định được vị trí.';
                        break;
                    case err.TIMEOUT:
                        msg = 'Thời gian quét vị trí GPS đã hết hạn. Vui lòng thử lại.';
                        break;
                }
                reject(new Error(msg));
            },
            {
                enableHighAccuracy: true,
                timeout: 10000,
                maximumAge: 0
            }
        );
    });
}
