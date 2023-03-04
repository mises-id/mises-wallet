/* import axios from "axios"; */

function memoizeCosines(N: number, cosMap: any) {
  cosMap = cosMap || {};
  cosMap[N] = new Array(N * N);

  const PI_N = Math.PI / N;

  for (let k = 0; k < N; k++) {
    for (let n = 0; n < N; n++) {
      cosMap[N][n + k * N] = Math.cos(PI_N * (n + 0.5) * k);
    }
  }
  return cosMap;
}

function dct(signal: number[], scale: number = 2) {
  const L = signal.length;
  let cosMap: any = null;

  if (!cosMap || !cosMap[L]) {
    cosMap = memoizeCosines(L, cosMap);
  }

  const coefficients = signal.map(function () {
    return 0;
  });

  return coefficients.map(function (_, ix) {
    return (
      scale *
      signal.reduce(function (prev, cur, index) {
        return prev + cur * cosMap[L][index + ix * L];
      }, 0)
    );
  });
}

// 一维数组升维
function createMatrix(arr: number[]) {
  const length = arr.length;
  const matrixWidth = Math.sqrt(length);
  const matrix = [];
  for (let i = 0; i < matrixWidth; i++) {
    const _temp = arr.slice(i * matrixWidth, i * matrixWidth + matrixWidth);
    matrix.push(_temp);
  }
  return matrix;
}

// 从矩阵中获取其“左上角”大小为 range × range 的内容
function getMatrixRange(matrix: number[][], range: number = 1) {
  const rangeMatrix = [];
  for (let i = 0; i < range; i++) {
    for (let j = 0; j < range; j++) {
      rangeMatrix.push(matrix[i][j]);
    }
  }
  return rangeMatrix;
}

function createImgData(dataDetail: number[]) {
  const canvas = document.createElement("canvas");
  const ctx = canvas.getContext("2d");
  const imgWidth = Math.sqrt(dataDetail.length / 4);
  console.log(imgWidth);
  const newImageData = ctx?.createImageData(imgWidth, imgWidth) as ImageData;
  for (let i = 0; i < dataDetail.length; i += 4) {
    const R = dataDetail[i];
    const G = dataDetail[i + 1];
    const B = dataDetail[i + 2];
    const Alpha = dataDetail[i + 3];

    newImageData.data[i] = R;
    newImageData.data[i + 1] = G;
    newImageData.data[i + 2] = B;
    newImageData.data[i + 3] = Alpha;
  }
  return newImageData;
}

function createGrayscale(imgData: ImageData) {
  const newData: number[] = Array(imgData.data.length);
  newData.fill(0);
  imgData.data.forEach((_data, index) => {
    if ((index + 1) % 4 === 0) {
      const R = imgData.data[index - 3];
      const G = imgData.data[index - 2];
      const B = imgData.data[index - 1];
      //0.299*float64(r/257) + 0.587*float64(g/257) + 0.114*float64(b/256)
      //const gray = ~~((R + G + B) / 3);
      const gray = 0.299 * (R / 257) + 0.587 * (G / 257) + 0.114 * (B / 256);
      newData[index - 3] = gray;
      newData[index - 2] = gray;
      newData[index - 1] = gray;
      newData[index] = 255; // Alpha 值固定为255
    }
  });
  //return newData;
  return createImgData(newData);
}

function hammingDistance(str1: string, str2: string) {
  let distance = 0;
  const str1Arr = str1.split("");
  const str2Arr = str2.split("");
  str1Arr.forEach((letter, index) => {
    if (letter !== str2Arr[index]) {
      distance++;
    }
  });
  return distance;
}

/* function arrayBufferToBase64(buffer: Iterable<number>) {
  let binary = "";
  const bytes = new Uint8Array(buffer);
  const len = bytes.byteLength;
  for (let i = 0; i < len; i++) {
    binary += String.fromCharCode(bytes[i]);
  }
  return window.btoa(binary);
}
function loadImage(imgSrc: string): Promise<string> {
  //imgSrc = "https://lido.fi/static/images/favicon/favicon-32x32.png";
  console.log("axios");
  return axios({
    method: "get",
    url: imgSrc,
    responseType: "arraybuffer",
  })
    .then((result) => {
      console.log("img1: ", result.data);
      return arrayBufferToBase64(result.data);
    })
    .catch((err) => {
      console.log("err: ", err.message);
      return "";
    });
} */
class ImageSimilar {
  constructor() {}
  async distance(image_url: string, phash: string) {
    const data = await this.compressImg(image_url, 32);
    const image_phash = this.getPHashFingerprint(createGrayscale(data));
    console.log("image_phash: ", image_phash);
    console.log("image_phash2: ", phash);
    const score = hammingDistance(image_phash, phash);
    return score;
  }
  getPHashFingerprint(imgData: any) {
    console.log("getPHashFingerprint", imgData.data);
    const dctData = dct(imgData.data as any);
    console.log("getPHashFingerprint", dctData);
    const dctMatrix = createMatrix(dctData);
    const rangeMatrix = getMatrixRange(dctMatrix, dctMatrix.length / 8);
    console.log("rangeMatrix", rangeMatrix);
    const rangeAve =
      rangeMatrix.reduce((pre, cur) => pre + cur, 0) / rangeMatrix.length;
    console.log("rangeAve: ", rangeAve);
    return rangeMatrix.map((val) => (val >= rangeAve ? 1 : 0)).join("");
  }

  getHashFingerprint(imgData: ImageData) {
    const grayList = imgData.data.reduce((pre: number[], _cur, index) => {
      if ((index + 1) % 4 === 0) {
        pre.push(imgData.data[index - 1]);
      }
      return pre;
    }, []);
    const length = grayList.length;
    console.log("grayList ", grayList);
    const grayAverage = grayList.reduce((pre, next) => pre + next, 0) / length;
    console.log("grayAverage ", grayAverage);
    return grayList.map((gray) => (gray >= grayAverage ? 1 : 0)).join("");
  }

  compressImg(imgSrc: string, imgWidth: number = 8): Promise<ImageData> {
    return new Promise(async (resolve, reject) => {
      if (!imgSrc) {
        reject("imgSrc can not be empty!");
      }
      const canvas = document.createElement("canvas");
      const ctx = canvas.getContext("2d");
      const img = new Image();
      img.crossOrigin = "Anonymous";
      img.onload = function () {
        canvas.width = imgWidth;
        canvas.height = imgWidth;
        ctx?.drawImage(img, 0, 0, imgWidth, imgWidth);
        const data = ctx?.getImageData(0, 0, imgWidth, imgWidth) as ImageData;
        console.log("img2: ", data);
        resolve(data);
      };
      console.log("imgSrc: ", imgSrc);

      img.src = imgSrc;
    });
  }
}

const image_similar = new ImageSimilar();
export { image_similar };
