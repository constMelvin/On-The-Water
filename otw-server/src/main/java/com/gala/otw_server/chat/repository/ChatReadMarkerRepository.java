package com.gala.otw_server.chat.repository;

import com.gala.otw_server.chat.entity.ChatReadMarker;
import com.gala.otw_server.chat.entity.ChatReadMarkerId;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

@Repository
public interface ChatReadMarkerRepository extends JpaRepository<ChatReadMarker, ChatReadMarkerId> {}
