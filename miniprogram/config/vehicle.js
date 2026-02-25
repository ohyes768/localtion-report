/**
 * 车辆配置
 */

const VEHICLE_CONFIG = {
  car001: {
    id: 'car001',
    name: '雷克萨斯LS200',
    plate: '浙***717',
    color: '#808080',
    brand: 'lexus',
    markerIcon: '/assets/images/markers/lexus_marker.png',
    logo: '/assets/images/logos/lexus_logo.png'
  },
  car002: {
    id: 'car002',
    name: '零跑T03',
    plate: '浙***8508',
    color: '#F0F0F0',
    brand: 'leapmotor',
    markerIcon: '/assets/images/markers/leapmotor_marker.png',
    logo: '/assets/images/logos/leapmotor_logo.png'
  },
  car003: {
    id: 'car003',
    name: '奥迪Q5',
    plate: '浙***598',
    color: '#000000',
    brand: 'audi',
    markerIcon: '/assets/images/markers/audi_marker.png',
    logo: '/assets/images/logos/audi_logo.png'
  },
  car004: {
    id: 'car004',
    name: '小米SU7',
    plate: '浙***9779',
    color: '#8B4789',
    brand: 'xiaomi',
    markerIcon: '/assets/images/markers/xiaomi_marker.png',
    logo: '/assets/images/logos/xiaomi_logo.png'
  }
};

/**
 * 获取车辆列表
 */
function getVehicleList() {
  return Object.values(VEHICLE_CONFIG);
}

/**
 * 根据ID获取车辆信息
 */
function getVehicleById(carId) {
  return VEHICLE_CONFIG[carId] || null;
}

module.exports = {
  VEHICLE_CONFIG,
  getVehicleList,
  getVehicleById
};
