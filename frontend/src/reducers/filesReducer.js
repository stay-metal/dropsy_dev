import {
  FETCH_FILES_REQUEST,
  FETCH_FILES_SUCCESS,
  FETCH_FILES_FAILURE,
  SET_SELECTED_EXTENSIONS,
  TOGGLE_SHOW_ALL_FILES,
  SET_SELECTED_FILES,
  SET_ANALYSIS_RESULTS,
  SET_EXPANDED_ACCORDION_ID,
} from "../actions/actionTypes";

const initialState = {
  files: [],
  loading: false,
  error: null,
  extensions: ["mp3", "wav", "flac", "ptx"],
  selectedExtensions: ["wav"],
  showAllFiles: false,
  selectedFiles: new Set(),
  analysisResults: {},
  expandedAccordionId: null,
};

const filesReducer = (state = initialState, action) => {
  switch (action.type) {
    case FETCH_FILES_REQUEST:
      return { ...state, loading: true, error: null };
    case FETCH_FILES_SUCCESS:
      return { ...state, loading: false, files: action.payload };
    case FETCH_FILES_FAILURE:
      return { ...state, loading: false, error: action.payload };
    case SET_SELECTED_EXTENSIONS:
      return { ...state, selectedExtensions: action.payload };
    case TOGGLE_SHOW_ALL_FILES:
      return { ...state, showAllFiles: !state.showAllFiles };
    case SET_SELECTED_FILES:
      return { ...state, selectedFiles: action.payload };
    case SET_ANALYSIS_RESULTS:
      return {
        ...state,
        analysisResults: { ...state.analysisResults, ...action.payload },
      };
    case SET_EXPANDED_ACCORDION_ID:
      return { ...state, expandedAccordionId: action.payload };
    default:
      return state;
  }
};

export default filesReducer;
