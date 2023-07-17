import { useEffect, useRef } from 'react';
import { useParams } from 'react-router-dom';
import { useDispatch } from 'react-redux';
import { queryMoreMessages } from '../../../../store/reducers/matches';
import './MessageLoader.css';

const MessageLoader = ({ offset }) => {

    const { matchId } = useParams();
    const loaderRef = useRef(null);
    const dispatch = useDispatch();

    const options = {
        root: null,
        rootMargin: "0px",
        threshold: 0.9
    }

    const loadMessages = (entries) => {
        const [ entry ] = entries;
        if (offset > 0 && entry.isIntersecting) {
            dispatch(queryMoreMessages({ matchId, offset }));
        }
    }

    useEffect(() => {
        const observer = new IntersectionObserver(loadMessages, options);
        if (loaderRef.current) observer.observe(loaderRef.current);
    }, [loaderRef, options]);

    return (
        <div id="message-loader" ref={loaderRef}>
            messages loading.
        </div>
    )
}

export default MessageLoader;